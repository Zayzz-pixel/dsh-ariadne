import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeFinalPlan, validateExecutionGraph, normalizeExecutionRun, legacyExecutionRun,
  isLinearExecutionGraph, linearExecutionPath, startExecutionRun, beginExecutionNode,
  resetExecutionNode, completeExecutionNode, approveExecutionCheckpoint, retryExecutionNode,
  cancelExecutionRun, currentExecutionNode, executionProgress, executionPath, isActiveExecutionRun,
} from '../lib/execution-state.js'

const NOW = '2026-08-30T00:00:00.000Z'
const LATER = '2026-08-30T01:00:00.000Z'
const GRAPH_ERROR = 'BRAINSTORM_EXECUTION_GRAPH_ERROR'
const RUN_ERROR = 'BRAINSTORM_EXECUTION_RUN_ERROR'
const SOURCE_OPTIONS = { selectedIds: ['source'], sourceNodes: [{ id: 'source', title: 'Source' }], now: NOW }

function node(id, kind = 'task') {
  return { id, kind, title: id, instruction: `完成 ${id}`, sourceNodeIds: ['source'], completionCriteria: ['产物可检查'] }
}

function edge(from, to, condition = 'success', routeKey) {
  return { id: `${from}-${to}-${condition}`, from, to, condition, ...(routeKey ? { routeKey } : {}) }
}

function linearGraph(count = 3) {
  const nodes = Array.from({ length: count }, (_, index) => node(`step-${index + 1}`))
  return { startNodeId: nodes[0]?.id, nodes, edges: nodes.slice(1).map((entry, index) => edge(nodes[index].id, entry.id)) }
}

function branchGraph() {
  return {
    startNodeId: 'research',
    nodes: [node('research'), node('decide', 'decision'), node('approve', 'checkpoint'), node('revise'), node('deliver')],
    edges: [edge('research', 'decide'), edge('decide', 'approve', 'route', 'ready'), edge('decide', 'revise', 'route', 'revise'), edge('approve', 'deliver'), edge('revise', 'deliver')],
  }
}

function plan(graph = linearGraph()) {
  return normalizeFinalPlan({ version: 2, graph, uncovered: [], generatedAt: NOW }, SOURCE_OPTIONS)
}

function start(value) {
  return startExecutionRun(value, undefined, { id: 'run-test', now: NOW })
}

function complete(value, run, args = {}) {
  return completeExecutionNode(value, run, { runId: run.id, nodeId: run.currentNodeId, outcome: 'completed', summary: '已完成', ...args }, { now: LATER })
}

function perform(value, run, args) {
  return complete(value, beginExecutionNode(value, run, run.currentNodeId, { now: NOW }), args)
}

test('Final Plan normalizes to graph-only v2, remains detached, and keeps generatedAt stable', () => {
  const raw = { graph: linearGraph(), generatedAt: NOW, items: [{ id: 'ignored' }] }
  const saved = JSON.stringify(raw)
  const value = normalizeFinalPlan(raw, { ...SOURCE_OPTIONS, now: LATER })
  assert.equal(value.version, 2)
  assert.equal(value.generatedAt, NOW)
  assert.equal('items' in value, false)
  assert.deepEqual(value.uncovered, [])
  value.graph.nodes[0].sourceNodeIds.push('changed')
  assert.equal(JSON.stringify(raw), saved)
  assert.equal(normalizeFinalPlan(undefined), undefined)
  assert.equal(normalizeFinalPlan(null), undefined)
  for (const invalid of [false, [], {}, { version: 9, graph: linearGraph() }, { version: 2, items: [] }]) assert.throws(() => normalizeFinalPlan(invalid), { code: GRAPH_ERROR })
})

test('missing graph IDs are deterministic and avoid explicitly assigned IDs', () => {
  const graph = {
    startNodeId: 'exec-node-2',
    nodes: [{ ...node('exec-node-2') }, { ...node('ignored'), id: undefined }],
    edges: [{ from: 'exec-node-2', to: 'exec-node-3', condition: 'success' }],
  }
  const first = plan(graph)
  assert.deepEqual(first.graph.nodes.map((entry) => entry.id), ['exec-node-2', 'exec-node-3'])
  assert.equal(first.graph.edges[0].id, 'exec-edge-1')
  assert.deepEqual(plan(graph), first)
})

const invalidGraphs = [
  ['missing start', (graph) => { graph.startNodeId = 'missing' }],
  ['duplicate node ID', (graph) => { graph.nodes.push({ ...graph.nodes[0] }) }],
  ['unsafe node ID', (graph) => { graph.nodes[0].id = '<script>' }],
  ['oversized node ID', (graph) => { graph.nodes[0].id = 'x'.repeat(81) }],
  ['duplicate edge ID', (graph) => { graph.edges[1].id = graph.edges[0].id }],
  ['unsafe edge ID', (graph) => { graph.edges[0].id = 'bad id' }],
  ['unknown endpoint', (graph) => { graph.edges[0].to = 'missing' }],
  ['self loop', (graph) => { graph.edges[0].to = graph.edges[0].from }],
  ['unreachable node', (graph) => { graph.nodes.push(node('orphan')) }],
  ['cycle', (graph) => { graph.edges.push(edge('step-3', 'step-1')) }],
  ['task extra success edge', (graph) => { graph.edges.push(edge('step-1', 'step-3')) }],
  ['task route edge', (graph) => { graph.edges[0].condition = 'route'; graph.edges[0].routeKey = 'yes' }],
  ['task duplicate failure edges', (graph) => { graph.edges = [edge('step-1', 'step-2', 'failure'), edge('step-1', 'step-3', 'failure')] }],
  ['route key on success', (graph) => { graph.edges[0].routeKey = 'bad' }],
  ['unknown condition', (graph) => { graph.edges[0].condition = 'any' }],
  ['unknown kind', (graph) => { graph.nodes[0].kind = 'parallel' }],
  ['empty instruction', (graph) => { graph.nodes[0].instruction = ' ' }],
  ['empty criteria', (graph) => { graph.nodes[0].completionCriteria = [] }],
  ['blank criterion', (graph) => { graph.nodes[0].completionCriteria = [' '] }],
  ['unselected source', (graph) => { graph.nodes[0].sourceNodeIds = ['unselected'] }],
]
for (const [name, mutate] of invalidGraphs) {
  test(`graph rejects ${name}`, () => {
    const graph = linearGraph()
    mutate(graph)
    assert.throws(() => validateExecutionGraph(graph, SOURCE_OPTIONS), { code: GRAPH_ERROR })
  })
}

test('graph supports 30 nodes and rejects 31; decisions and checkpoints use bounded edges', () => {
  assert.equal(validateExecutionGraph(linearGraph(30)).nodes.length, 30)
  assert.throws(() => validateExecutionGraph(linearGraph(31)), /1–30/)
  const invalid = [
    (graph) => { graph.edges = graph.edges.filter((entry) => entry.to !== 'revise') },
    (graph) => { graph.edges.find((entry) => entry.to === 'revise').routeKey = 'ready' },
    (graph) => { delete graph.edges.find((entry) => entry.to === 'revise').routeKey },
    (graph) => { graph.edges.push(edge('decide', 'deliver')) },
    (graph) => { graph.edges.push(edge('decide', 'approve', 'failure'), edge('decide', 'revise', 'failure')) },
    (graph) => { graph.edges.push(edge('approve', 'revise')) },
    (graph) => { graph.edges.push(edge('approve', 'revise', 'failure')) },
    (graph) => { graph.edges.push(edge('approve', 'revise', 'route', 'no')) },
  ]
  for (const mutate of invalid) {
    const graph = branchGraph()
    mutate(graph)
    assert.throws(() => validateExecutionGraph(graph), { code: GRAPH_ERROR })
  }
  const valid = branchGraph()
  valid.edges.push(edge('decide', 'revise', 'failure'))
  assert.equal(validateExecutionGraph(valid), valid)
})

test('selected coverage accepts explicit explained gaps and checks source existence', () => {
  const graph = linearGraph(1)
  const options = { ...SOURCE_OPTIONS, selectedIds: ['source', 'gap-source'], sourceNodes: [...SOURCE_OPTIONS.sourceNodes, { id: 'gap-source', title: 'Gap' }] }
  const uncovered = [{ title: 'Gap', sourceNodeIds: ['gap-source'], reason: '需要用户补充范围' }]
  assert.doesNotThrow(() => normalizeFinalPlan({ graph, uncovered }, options))
  assert.throws(() => normalizeFinalPlan({ graph, uncovered: [{ ...uncovered[0], reason: ' ' }] }, options), /not covered/)
  assert.throws(() => normalizeFinalPlan({ graph, uncovered: [{ title: 'Gap', reason: '同名仍需要显式 ID' }] }, options), /not covered/)
  assert.throws(() => validateExecutionGraph(graph, { ...SOURCE_OPTIONS, sourceNodes: [] }), /missing/)
  assert.throws(() => normalizeFinalPlan({ graph, uncovered: [{ ...uncovered[0], sourceNodeIds: ['outside'] }] }, options), /unselected/)
})

function legacyPlan(done = [false, false, false]) {
  return { version: 1, generatedAt: NOW, items: done.map((value, index) => ({ id: `old-${index + 1}`, title: `Old ${index + 1}`, sourceNodeIds: ['source'], nextStep: `执行步骤 ${index + 1}`, done: value })), uncovered: [{ id: 'gap', title: '补充产物', reason: '当前方案暂不涉及' }] }
}

test('legacy plans migrate titles, sources, notes, criteria, and uncovered without mutation', () => {
  const raw = legacyPlan([false])
  raw.items[0].note = '说明内容\n## 验收条件\n- 测试通过\n- 报告可读\n## 其他\n无'
  const original = JSON.stringify(raw)
  const value = normalizeFinalPlan(raw, SOURCE_OPTIONS)
  assert.equal(value.graph.nodes.length, 1)
  assert.deepEqual(value.graph.edges, [])
  assert.equal(value.graph.nodes[0].title, 'Old 1')
  assert.match(value.graph.nodes[0].instruction, /执行步骤 1\n\n说明内容/)
  assert.deepEqual(value.graph.nodes[0].sourceNodeIds, ['source'])
  assert.deepEqual(value.graph.nodes[0].completionCriteria, ['测试通过', '报告可读'])
  assert.deepEqual(value.uncovered, raw.uncovered)
  assert.equal('done' in value.graph.nodes[0], false)
  assert.equal('items' in value, false)
  assert.equal(JSON.stringify(raw), original)
  assert.equal(legacyExecutionRun(raw, value, { now: NOW }), undefined)
  assert.deepEqual(linearExecutionPath(normalizeFinalPlan(legacyPlan(), SOURCE_OPTIONS).graph), ['old-1', 'old-2', 'old-3'])
})

test('legacy gap title fallback works only for a unique selected title with a reason', () => {
  const raw = legacyPlan([false])
  raw.uncovered = [{ title: ' Gap ', reason: '暂无输入' }]
  const options = { ...SOURCE_OPTIONS, selectedIds: ['source', 'gap'], sourceNodes: [...SOURCE_OPTIONS.sourceNodes, { id: 'gap', title: 'Gap' }] }
  assert.deepEqual(normalizeFinalPlan(raw, options).uncovered[0].sourceNodeIds, ['gap'])
  assert.throws(() => normalizeFinalPlan(raw, { ...options, selectedIds: ['source', 'gap', 'gap2'], sourceNodes: [...options.sourceNodes, { id: 'gap2', title: 'Gap' }] }), /not covered/)
  delete raw.uncovered[0].reason
  assert.throws(() => normalizeFinalPlan(raw, options), /not covered/)
})

test('non-contiguous legacy done markers remain complete and traversal skips them', () => {
  const raw = legacyPlan([false, true, false])
  const value = normalizeFinalPlan(raw, SOURCE_OPTIONS)
  const migrated = legacyExecutionRun(raw, value, { now: LATER })
  assert.deepEqual(legacyExecutionRun(raw, value, { now: NOW }), migrated)
  assert.equal(migrated.currentNodeId, 'old-1')
  assert.equal(migrated.nodeStates['old-2'].status, 'completed')
  assert.equal(migrated.nodeStates['old-2'].attempts, 0)
  assert.equal(migrated.startedAt, NOW)
  assert.deepEqual(normalizeExecutionRun(migrated, value), migrated)
  const next = perform(value, migrated)
  assert.equal(next.currentNodeId, 'old-3')
  assert.deepEqual(executionPath(value, next), ['old-1', 'old-2', 'old-3'])
  assert.equal(next.nodeStates['old-2'].attempts, 0)
  assert.equal(perform(value, next).status, 'completed')
  const allRaw = legacyPlan([true, true, true])
  const allPlan = normalizeFinalPlan(allRaw, SOURCE_OPTIONS)
  const allRun = legacyExecutionRun(allRaw, allPlan)
  assert.equal(allRun.status, 'completed')
  assert.equal(allRun.currentNodeId, undefined)
  assert.equal(allRun.completedAt, NOW)
  assert.deepEqual(normalizeExecutionRun(allRun, allPlan), allRun)
})

test('linear helpers reject branches, checkpoints, disconnected nodes and cycles', () => {
  assert.equal(isLinearExecutionGraph(linearGraph(1)), true)
  assert.deepEqual(linearExecutionPath(linearGraph()), ['step-1', 'step-2', 'step-3'])
  assert.deepEqual(linearExecutionPath(branchGraph()), [])
  assert.deepEqual(linearExecutionPath({ startNodeId: 'check', nodes: [node('check', 'checkpoint')], edges: [] }), [])
  const cyclic = linearGraph()
  cyclic.edges.push(edge('step-3', 'step-1'))
  assert.deepEqual(linearExecutionPath(cyclic), [])
  assert.equal(isLinearExecutionGraph({ nodes: [], edges: [] }), false)
})

test('start creates one ready node, begins exactly once, and preserves its inputs', () => {
  const value = plan()
  const originalPlan = JSON.stringify(value)
  const run = start(value)
  const originalRun = JSON.stringify(run)
  assert.equal(run.status, 'ready')
  assert.equal(run.currentNodeId, 'step-1')
  assert.equal(currentExecutionNode(value, run).id, 'step-1')
  assert.equal(run.planGeneratedAt, NOW)
  assert.equal(run.nodeStates['step-2'].status, 'pending')
  assert.throws(() => startExecutionRun(value, run), /active/)
  const running = beginExecutionNode(value, run, 'step-1', { now: LATER })
  assert.equal(running.nodeStates['step-1'].attempts, 1)
  assert.equal(running.nodeStates['step-1'].startedAt, LATER)
  assert.equal(running.status, 'running')
  assert.throws(() => beginExecutionNode(value, running, 'step-1'), /before begin/)
  assert.equal(JSON.stringify(run), originalRun)
  assert.equal(JSON.stringify(value), originalPlan)
  assert.deepEqual(normalizeExecutionRun(JSON.parse(JSON.stringify(running)), value), running)
})

test('begin, reset, retry and approve require the explicit current node', () => {
  const value = plan()
  for (const operation of [beginExecutionNode, resetExecutionNode, retryExecutionNode, approveExecutionCheckpoint]) {
    assert.throws(() => operation(value, start(value), 'step-2'), /currentNodeId/)
    assert.throws(() => operation(value, start(value), undefined), /currentNodeId/)
  }
})

test('completed task follows success and terminal completion records timestamps', () => {
  const value = plan()
  let run = start(value)
  run = perform(value, run, { outputRefs: [' report.md '], evidence: [' tests pass '] })
  assert.equal(run.currentNodeId, 'step-2')
  assert.equal(run.nodeStates['step-1'].completedAt, LATER)
  assert.deepEqual(run.nodeStates['step-1'].outputRefs, ['report.md'])
  assert.deepEqual(run.nodeStates['step-1'].evidence, ['tests pass'])
  run = perform(value, run)
  run = perform(value, run)
  assert.equal(run.status, 'completed')
  assert.equal(run.currentNodeId, undefined)
  assert.equal(run.completedAt, LATER)
  assert.equal(run.startedAt, NOW)
  assert.equal(isActiveExecutionRun(run), false)
  assert.equal(executionProgress(value, run).completed, 3)
  assert.deepEqual(normalizeExecutionRun(JSON.parse(JSON.stringify(run)), value), run)
})

test('failed task follows a failure edge; no failure edge and blocked outcome remain current', () => {
  const graph = { startNodeId: 'work', nodes: [node('work'), node('fix')], edges: [edge('work', 'fix', 'failure')] }
  const value = plan(graph)
  const next = perform(value, start(value), { outcome: 'failed', summary: '测试未通过' })
  assert.equal(next.currentNodeId, 'fix')
  assert.equal(next.nodeStates.work.status, 'failed')
  assert.equal(next.status, 'ready')
  assert.deepEqual(normalizeExecutionRun(next, value), next)
  const blocked = perform(value, start(value), { outcome: 'blocked' })
  assert.equal(blocked.currentNodeId, 'work')
  assert.equal(blocked.status, 'blocked')
  const terminal = plan(linearGraph(1))
  assert.equal(perform(terminal, start(terminal), { outcome: 'failed' }).status, 'blocked')
})

test('decision enforces exact route and reaches a user-only checkpoint; other branch stays pending', () => {
  const value = plan(branchGraph())
  const ready = perform(value, start(value))
  const running = beginExecutionNode(value, ready, 'decide', { now: NOW })
  for (const args of [{}, { routeKey: 'missing' }, { routeKey: 'ready'.padEnd(81, 'x') }]) assert.throws(() => complete(value, running, args), { code: RUN_ERROR })
  let run = complete(value, running, { routeKey: 'ready' })
  assert.equal(run.status, 'waiting')
  assert.equal(run.currentNodeId, 'approve')
  assert.equal(run.nodeStates.revise.status, 'pending')
  assert.throws(() => beginExecutionNode(value, run, 'approve'), /checkpoint/)
  assert.throws(() => complete(value, run), /Agent cannot complete a checkpoint/)
  run = approveExecutionCheckpoint(value, run, 'approve', { now: LATER })
  assert.equal(run.nodeStates.approve.summary, '用户已批准')
  assert.equal(run.nodeStates.approve.attempts, 0)
  assert.equal(run.currentNodeId, 'deliver')
  run = perform(value, run)
  assert.equal(run.status, 'completed')
  assert.equal(run.nodeStates.revise.status, 'pending')
  assert.deepEqual(executionPath(value, run), ['research', 'decide', 'approve', 'deliver'])
  assert.equal(executionProgress(value, run).completed, 4)
  assert.equal(executionProgress(value, run).total, 5)
  assert.deepEqual(normalizeExecutionRun(run, value), run)
})

test('decision failure follows its failure edge and otherwise blocks without requesting a route', () => {
  const graph = branchGraph()
  graph.edges.push(edge('decide', 'revise', 'failure'))
  const value = plan(graph)
  let ready = perform(value, start(value))
  const next = perform(value, ready, { outcome: 'failed' })
  assert.equal(next.currentNodeId, 'revise')
  assert.deepEqual(normalizeExecutionRun(next, value), next)
  const noFailure = plan(branchGraph())
  ready = perform(noFailure, start(noFailure))
  const blocked = perform(noFailure, ready, { outcome: 'failed' })
  assert.equal(blocked.currentNodeId, 'decide')
  assert.equal(blocked.status, 'blocked')
  assert.throws(() => perform(value, ready, { outcome: 'failed', routeKey: 'revise' }), /only for a completed decision/)
})

test('checkpoint can start or end a Run and only explicit approval advances it', () => {
  const value = plan({ startNodeId: 'approve', nodes: [node('approve', 'checkpoint')], edges: [] })
  const run = start(value)
  assert.equal(run.status, 'waiting')
  assert.deepEqual(normalizeExecutionRun(run, value), run)
  assert.equal(approveExecutionCheckpoint(value, run, 'approve', { now: LATER }).status, 'completed')
})

test('reset rolls back only a running node and retry increments attempts only on begin', () => {
  const value = plan(linearGraph(1))
  const ready = start(value)
  assert.throws(() => resetExecutionNode(value, ready, ready.currentNodeId), /running/)
  const running = beginExecutionNode(value, ready, ready.currentNodeId, { now: NOW })
  let run = resetExecutionNode(value, running, running.currentNodeId, { now: LATER, reason: 'Prompt 入队失败' })
  assert.equal(run.nodeStates['step-1'].attempts, 1)
  assert.equal(run.nodeStates['step-1'].summary, 'Prompt 入队失败')
  assert.equal(run.status, 'ready')
  assert.equal(running.status, 'running')
  run = perform(value, run, { outcome: 'blocked', summary: '需要更多输入' })
  const retried = retryExecutionNode(value, run, run.currentNodeId, { now: LATER })
  assert.equal(retried.nodeStates['step-1'].attempts, 2)
  assert.equal(retried.nodeStates['step-1'].completedAt, undefined)
  assert.equal(retried.status, 'ready')
  assert.equal(run.status, 'blocked')
  assert.equal(beginExecutionNode(value, retried, retried.currentNodeId, { now: LATER }).nodeStates['step-1'].attempts, 3)
  assert.equal(beginExecutionNode(value, run, run.currentNodeId, { now: LATER }).nodeStates['step-1'].attempts, 3)
})

test('stale or invalid completions fail without changing the Run', () => {
  const value = plan()
  const run = beginExecutionNode(value, start(value), 'step-1', { now: NOW })
  const original = JSON.stringify(run)
  for (const args of [{ runId: 'wrong' }, { nodeId: 'step-2' }, { nodeId: undefined }, { outcome: 'ready' }, { summary: '' }, { routeKey: 'forbidden' }]) assert.throws(() => complete(value, run, args), { code: RUN_ERROR })
  assert.throws(() => complete(value, start(value)), /running/)
  assert.equal(JSON.stringify(run), original)
  const compact = complete(value, run, { summary: 'x'.repeat(5000), outputRefs: Array(30).fill('r'.repeat(800)), evidence: Array(30).fill('e'.repeat(1500)) })
  const result = compact.nodeStates['step-1']
  assert.equal(result.summary.length, 2000)
  assert.equal(result.outputRefs.length, 20)
  assert.equal(result.outputRefs[0].length, 500)
  assert.equal(result.evidence[0].length, 1000)
  assert.throws(() => complete(value, run, { evidence: [{}] }), /must be a string/)
})

test('cancel retains its snapshot and allows a fresh Run; cancelled completions are rejected', () => {
  const value = plan()
  const run = beginExecutionNode(value, start(value), 'step-1', { now: NOW })
  const cancelled = cancelExecutionRun(value, run, { now: LATER })
  assert.equal(cancelled.status, 'cancelled')
  assert.equal(cancelled.currentNodeId, 'step-1')
  assert.equal(cancelled.completedAt, LATER)
  assert.deepEqual(cancelled.nodeStates, run.nodeStates)
  assert.equal(isActiveExecutionRun(cancelled), false)
  assert.deepEqual(normalizeExecutionRun(cancelled, value), cancelled)
  assert.throws(() => complete(value, cancelled), /active/)
  const fresh = startExecutionRun(value, cancelled, { id: 'run-again', now: LATER })
  assert.equal(fresh.nodeStates['step-1'].attempts, 0)
  assert.equal(fresh.id, 'run-again')
  for (const status of ['ready', 'running', 'waiting', 'blocked']) assert.equal(isActiveExecutionRun({ status }), true)
})

test('Run normalization rejects mismatched plan, current node, status and selected path', () => {
  const value = plan()
  const raw = start(value)
  const corrupt = [
    (run) => { run.planGeneratedAt = LATER },
    (run) => { run.currentNodeId = 'missing' },
    (run) => { run.status = 'running' },
    (run) => { run.status = 'completed'; delete run.currentNodeId },
    (run) => { run.nodeStates['step-1'].attempts = -1 },
    (run) => { run.nodeStates['step-1'].status = 'waiting'; run.status = 'waiting' },
    (run) => { run.nodeStates.unknown = { status: 'pending', attempts: 0 } },
    (run) => { run.completedAt = NOW },
    (run) => { run.nodeStates['step-2'].status = 'ready' },
    (run) => { run.nodeStates['step-1'].status = 'pending'; run.nodeStates['step-2'].status = 'ready'; run.currentNodeId = 'step-2' },
  ]
  for (const mutate of corrupt) {
    const run = structuredClone(raw)
    mutate(run)
    assert.throws(() => normalizeExecutionRun(run, value), { code: RUN_ERROR })
  }
  assert.equal(normalizeExecutionRun(undefined, value), undefined)
  assert.equal(currentExecutionNode(value, undefined), undefined)
  assert.deepEqual(executionPath(value, undefined), [])
  assert.equal(executionProgress(value, undefined).pending, 3)
})
