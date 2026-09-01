import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  emptyMap,
  makeNodeId,
  latestMap,
  normalizeFrame,
  normalizeMap,
  treeFacts,
  validateMap,
  applyOps,
  applyDirectOps,
  applyFinalPlan,
  applyExecutionResult,
  returnToExploring,
  outlineMap,
  mapStats,
} from '../lib/map-state.js'

const NOW = '2026-08-21T00:00:00.000Z'
const LATER = '2026-08-21T01:00:00.000Z'

function executionGraph(steps = [{ id: 'exec-a', title: 'Plan A', instruction: 'Step A', sourceNodeIds: ['a'] }]) {
  const nodes = steps.map((step) => ({ kind: 'task', completionCriteria: ['形成可检查产物'], ...step }))
  return {
    startNodeId: nodes[0].id,
    nodes,
    edges: nodes.slice(1).map((node, index) => ({ id: `edge-${index + 1}`, from: nodes[index].id, to: node.id, condition: 'success' })),
  }
}

function selectedMap(ids = ['a']) {
  return applyOps(null, {
    topic: 'T',
    upsertNodes: ids.map((id) => ({ id, title: id.toUpperCase(), status: 'expanded' })),
    selectedIds: ids,
  }, { now: NOW }).map
}

function legacyPlannedMap(done) {
  return {
    ...selectedMap(), version: 1, phase: 'executing',
    finalPlan: {
      version: 1, generatedAt: NOW,
      items: done.map((value, index) => ({ id: `old-${index + 1}`, sourceNodeIds: ['a'], title: `Step ${index + 1}`, nextStep: `Do ${index + 1}`, done: value })),
      uncovered: [{ id: 'gap-1', title: '待确认', reason: '需要更多材料' }],
    },
  }
}

function frozen(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(frozen)
    Object.freeze(value)
  }
  return value
}

test('first call creates a v2 map without persisted depth', () => {
  const { map, changes } = applyOps(null, {
    topic: '可视化头脑风暴插件',
    frame: { goal: '  形成可验证的产品方案  ', organizingPrinciple: ' 按用户价值与实现约束组织 ' },
    upsertNodes: [{ id: 'root', title: '产品方向', depth: 1, source: 'user' }],
  }, { now: NOW })

  assert.equal(map.version, 2)
  assert.equal(map.phase, 'exploring')
  assert.equal(map.nodes[0].title, '产品方向')
  assert.deepEqual(map.frame, { goal: '形成可验证的产品方案', organizingPrinciple: '按用户价值与实现约束组织' })
  assert.equal('depth' in map.nodes[0], false)
  assert.equal(changes.nodesAdded, 1)
})

test('Session Frame normalizes optional fields and disappears when empty', () => {
  assert.deepEqual(normalizeFrame({ goal: '  Goal  ', organizingPrinciple: '' }), { goal: 'Goal', organizingPrinciple: '' })
  assert.equal(normalizeFrame({ goal: 'x'.repeat(520) }).goal.length, 500)
  assert.equal(normalizeFrame({ goal: ' ', organizingPrinciple: ' ' }), undefined)

  let map = applyOps(null, { topic: 'T', upsertNodes: [] }, { now: NOW }).map
  assert.equal(map.frame, undefined)
  map = applyDirectOps(map, { type: 'set-frame', goal: ' 本次目标 ', organizingPrinciple: ' 按证据组织 ' }, { now: NOW })
  assert.deepEqual(map.frame, { goal: '本次目标', organizingPrinciple: '按证据组织' })
  assert.equal(map.topic, 'T')
  assert.deepEqual(map.layout, { offsets: {}, sizes: {} })
  map = applyDirectOps(map, { type: 'set-frame', goal: '', organizingPrinciple: '' }, { now: NOW })
  assert.equal(map.frame, undefined)
  assert.throws(() => validateMap({ ...map, frame: { goal: 42, organizingPrinciple: '' } }), /frame/)
})

test('structured node notes have room for legacy content plus section headings', () => {
  let map = applyOps(null, { topic: 'T', upsertNodes: [{ id: 'a', title: 'A' }] }, { now: NOW }).map
  const note = `## 当前理解\n\n${'x'.repeat(1100)}\n\n## 待解决\n\n\n\n## 下一步`
  map = applyDirectOps(map, { type: 'set-note', nodeId: 'a', note }, { now: NOW })
  assert.equal(map.nodes[0].note, note)
})

test('personal notes persist independently from Agent map updates', () => {
  let map = applyOps(null, { topic: 'T', upsertNodes: [{ id: 'a', title: 'A', note: '共享记录' }] }, { now: NOW }).map
  map = applyDirectOps(map, { type: 'set-user-note', nodeId: 'a', userNote: '  我的原始想法\n第二行  ' }, { now: LATER })
  assert.equal(map.nodes[0].userNote, '  我的原始想法\n第二行  ')
  assert.equal(map.nodes[0].userNoteUpdatedAt, LATER)

  const updated = applyOps(map, { upsertNodes: [{ id: 'a', note: 'Agent 更新后的共享记录' }] }, { now: LATER }).map
  assert.equal(updated.nodes[0].note, 'Agent 更新后的共享记录')
  assert.equal(updated.nodes[0].userNote, '  我的原始想法\n第二行  ')
  assert.equal(updated.nodes[0].userNoteUpdatedAt, LATER)
  assert.equal(outlineMap(updated).includes('我的原始想法'), false, 'Agent-facing outline excludes the personal note')
  assert.throws(() => applyOps(updated, { removeNodeIds: ['a'] }, { now: LATER }), /clear the personal note/)

  map = applyDirectOps(updated, { type: 'set-user-note', nodeId: 'a', userNote: '' }, { now: LATER })
  assert.equal(map.nodes[0].userNote, undefined)
  assert.equal(map.nodes[0].userNoteUpdatedAt, undefined)
  assert.equal(applyOps(map, { removeNodeIds: ['a'] }, { now: LATER }).map.nodes.length, 0)
})

test('normalizeMap migrates a legacy v1 map without rewriting history', () => {
  const legacy = {
    version: 1,
    topic: ' Legacy topic ',
    phase: 'executing',
    nodes: [
      { id: 'a', title: ' A ', status: 'selected', depth: 1, source: 'user', createdAt: NOW, updatedAt: NOW },
      { id: 'b', title: 'B', status: 'expanded', depth: 2, source: 'agent', createdAt: NOW, updatedAt: NOW },
    ],
    links: [
      { from: 'a', to: 'b', kind: 'parent' },
      { from: 'a', to: 'missing', kind: 'parent' },
      { from: 'b', to: 'a', kind: 'related' },
    ],
    selectedIds: ['a', 'missing'],
    layout: {
      offsets: { a: { dx: 12, dy: 0 }, missing: { dx: 1, dy: 1 } },
      sizes: { b: { w: 220, h: 80 }, missing: { w: 1, h: 1 } },
    },
    createdAt: NOW,
    updatedAt: NOW,
  }

  const map = normalizeMap(legacy, { now: NOW })
  assert.equal(map.version, 2)
  assert.equal(map.topic, 'Legacy topic')
  assert.equal(map.phase, 'exploring')
  assert.equal(map.finalPlan, undefined)
  assert.equal(map.nodes[0].status, 'expanded')
  assert.equal('depth' in map.nodes[0], false)
  assert.deepEqual(map.links, [{ from: 'a', to: 'b', kind: 'parent' }])
  assert.deepEqual(map.selectedIds, ['a'])
  assert.deepEqual(map.layout.offsets, { a: { dx: 12, dy: 0 } })
  assert.deepEqual(map.layout.sizes, { b: { w: 220, h: 80 } })
})

test('treeFacts derives roots, depth, ancestors and descendants', () => {
  const map = normalizeMap({
    version: 1,
    topic: 'T',
    nodes: [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
      { id: 'c', title: 'C' },
      { id: 'd', title: 'D' },
    ],
    links: [
      { from: 'a', to: 'b', kind: 'parent' },
      { from: 'b', to: 'c', kind: 'parent' },
    ],
  }, { now: NOW })

  const facts = treeFacts(map)
  assert.deepEqual(facts.roots, ['a', 'd'])
  assert.equal(facts.depthById.get('a'), 1)
  assert.equal(facts.depthById.get('c'), 3)
  assert.deepEqual(facts.ancestorsById.get('c'), ['a', 'b'])
  assert.deepEqual(facts.descendantsById.get('a'), ['b', 'c'])
})

test('id-less upsert is idempotent by parent and normalized title', () => {
  const first = applyOps(null, {
    topic: 'T',
    upsertNodes: [
      { id: 'root', title: 'Root' },
      { title: '  Child   Idea ', parentId: 'root' },
    ],
  }, { now: NOW })
  const child = first.map.nodes.find((node) => node.id !== 'root')

  const second = applyOps(first.map, {
    upsertNodes: [{ title: 'child idea', parentId: 'root', status: 'expanded' }],
  }, { now: NOW })
  const third = applyOps(second.map, {
    upsertNodes: [{ title: 'Child Idea' }],
  }, { now: NOW })

  assert.equal(second.map.nodes.length, 2)
  assert.equal(second.map.nodes.find((node) => node.id === child.id).status, 'expanded')
  assert.deepEqual(second.map.links, [{ from: 'root', to: child.id, kind: 'parent' }])
  assert.equal(third.map.nodes.length, 3)
  assert.notEqual(third.map.nodes.at(-1).id, child.id)
  assert.equal(child.id, makeNodeId('Child Idea', 'root'))
})

test('partial upsert by id keeps title, note and source', () => {
  const first = applyOps(null, {
    topic: 'T',
    upsertNodes: [{ id: 'x', title: '原始标题', note: '原记录', source: 'user' }],
  }, { now: NOW })
  const second = applyOps(first.map, {
    upsertNodes: [{ id: 'x', status: 'expanded' }],
  }, { now: NOW })

  assert.deepEqual(second.map.nodes[0], {
    id: 'x',
    title: '原始标题',
    note: '原记录',
    status: 'expanded',
    source: 'user',
    createdAt: NOW,
    updatedAt: NOW,
  })
})

test('selection pool does not change node status', () => {
  const first = applyOps(null, {
    topic: 'T',
    upsertNodes: [{ id: 'a', title: 'A', status: 'expanded' }],
  }, { now: NOW })
  const second = applyOps(first.map, { selectedIds: ['a'] }, { now: NOW })

  assert.deepEqual(second.map.selectedIds, ['a'])
  assert.equal(second.map.nodes[0].status, 'expanded')
})

test('selected status cannot be written outside Final Plan', () => {
  const first = applyOps(null, { topic: 'T', upsertNodes: [{ id: 'a', title: 'A' }] }, { now: NOW })

  assert.throws(
    () => applyOps(first.map, { upsertNodes: [{ id: 'a', status: 'selected' }] }, { now: NOW }),
    /Final Plan/,
  )
  assert.throws(
    () => applyDirectOps(first.map, { type: 'set-status', nodeId: 'a', status: 'selected' }, { now: NOW }),
    /selected/,
  )
})

test('applyFinalPlan writes one v2 execution graph and selected statuses without starting a Run', () => {
  const base = applyOps(null, {
    topic: 'T',
    upsertNodes: [
      { id: 'a', title: 'A', status: 'expanded' },
      { id: 'b', title: 'B', status: 'parked' },
    ],
    selectedIds: ['a', 'b'],
  }, { now: NOW }).map

  const map = applyFinalPlan(base, {
    graph: executionGraph([
      { id: 'verify-b', sourceNodeIds: ['b'], title: '先做 B', instruction: '验证 B' },
      { id: 'build-a', sourceNodeIds: ['a'], title: '再做 A', instruction: '实现 A\n\n保持简单' },
    ]),
    uncovered: [{ title: '待确认事项', reason: '数据不足' }],
  }, { now: NOW })

  assert.equal(map.phase, 'executing')
  assert.equal(map.finalPlan.version, 2)
  assert.equal(map.finalPlan.items, undefined)
  assert.equal(map.executionRun, undefined)
  assert.deepEqual(map.finalPlan.graph.nodes.map((node) => node.title), ['先做 B', '再做 A'])
  assert.deepEqual(map.finalPlan.graph.nodes.map((node) => node.instruction), ['验证 B', '实现 A\n\n保持简单'])
  assert.deepEqual(map.finalPlan.graph.edges, [{ id: 'edge-1', from: 'verify-b', to: 'build-a', condition: 'success' }])
  assert.deepEqual(map.nodes.map((node) => node.status), ['selected', 'selected'])
  assert.equal(map.finalPlan.generatedAt, NOW)
})

test('Final Plan requires covered selected nodes, a non-empty instruction and explicit criteria', () => {
  const base = applyOps(null, {
    topic: 'T',
    upsertNodes: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
    selectedIds: ['a', 'b'],
  }, { now: NOW }).map

  assert.throws(
    () => applyFinalPlan(base, { graph: executionGraph() }, { now: NOW }),
    /selected node b/,
  )
  assert.throws(
    () => applyFinalPlan(base, { graph: executionGraph([{ id: 'exec-a', sourceNodeIds: ['a', 'b'], title: 'A', instruction: '  ' }]) }, { now: NOW }),
    /instruction/,
  )
  assert.throws(() => applyFinalPlan(base, { graph: executionGraph([{ id: 'exec-a', sourceNodeIds: ['a', 'b'], title: 'A', instruction: 'go', completionCriteria: [] }]) }, { now: NOW }), /completionCriteria/)
  const withGap = applyFinalPlan(base, { graph: executionGraph(), uncovered: [{ title: 'B', sourceNodeIds: ['b'], reason: '下一轮再展开' }] }, { now: NOW })
  assert.equal(withGap.phase, 'executing')
  assert.deepEqual(withGap.finalPlan.uncovered[0].sourceNodeIds, ['b'])
  assert.throws(() => applyFinalPlan(base, { items: [] }, { now: NOW }), /execution graph/)
})

test('returnToExploring clears Plan and Run, keeps candidates and restores selected nodes', () => {
  const base = applyOps(null, {
    topic: 'T',
    upsertNodes: [{ id: 'a', title: 'A', status: 'expanded' }],
    selectedIds: ['a'],
  }, { now: NOW }).map
  const planned = applyFinalPlan(base, { graph: executionGraph() }, { now: NOW })
  const executing = applyDirectOps(planned, [
    { type: 'start-execution-run' }, { type: 'begin-execution-node', nodeId: 'exec-a' },
  ], { id: 'run-return', now: NOW })
  const original = JSON.stringify(executing)
  const exploring = returnToExploring(frozen(executing), { now: LATER })

  assert.equal(exploring.phase, 'exploring')
  assert.equal(exploring.finalPlan, undefined)
  assert.equal(exploring.executionRun, undefined)
  assert.deepEqual(exploring.selectedIds, ['a'])
  assert.equal(exploring.nodes[0].status, 'expanded')
  assert.equal(exploring.updatedAt, LATER)
  assert.equal(JSON.stringify(executing), original)
})

test('typed Direct Ops edit map and Final Plan deterministically', () => {
  let map = applyOps(null, {
    topic: 'T',
    upsertNodes: [{ id: 'a', title: 'A', status: 'expanded' }],
    selectedIds: ['a'],
  }, { now: NOW }).map

  map = applyDirectOps(map, [
    { type: 'set-topic', topic: 'New Topic' },
    { type: 'set-title', nodeId: 'a', title: 'New A' },
    { type: 'set-note', nodeId: 'a', note: '细节' },
    { type: 'set-user-note', nodeId: 'a', userNote: '我的笔记' },
    { type: 'set-offset', nodeId: 'a', dx: 24, dy: 12 },
    { type: 'set-size', nodeId: 'a', w: 220, h: 88 },
  ], { now: NOW })

  assert.equal(map.topic, 'New Topic')
  assert.equal(map.nodes[0].title, 'New A')
  assert.equal(map.nodes[0].note, '细节')
  assert.equal(map.nodes[0].userNote, '我的笔记')
  assert.deepEqual(map.layout.offsets.a, { dx: 24, dy: 12 })
  assert.deepEqual(map.layout.sizes.a, { w: 220, h: 88 })

  map = applyFinalPlan(map, {
    graph: executionGraph(),
  }, { now: NOW })
  map = applyDirectOps(map, [
    { type: 'set-execution-node-title', nodeId: 'exec-a', title: 'Updated plan' },
    { type: 'set-execution-node-instruction', nodeId: 'exec-a', instruction: ' Updated step ' },
    { type: 'set-execution-node-criteria', nodeId: 'exec-a', completionCriteria: [' Tests pass '] },
    { type: 'set-execution-node-inputs', nodeId: 'exec-a', requiredInputs: [' input.md '] },
    { type: 'set-execution-node-outputs', nodeId: 'exec-a', expectedOutputs: [' report.md '] },
  ], { now: LATER })

  const node = map.finalPlan.graph.nodes[0]
  assert.equal(node.title, 'Updated plan')
  assert.equal(node.instruction, 'Updated step')
  assert.deepEqual(node.completionCriteria, ['Tests pass'])
  assert.deepEqual(node.requiredInputs, ['input.md'])
  assert.deepEqual(node.expectedOutputs, ['report.md'])
  assert.equal(node.done, undefined)
  assert.equal(map.executionRun, undefined)
  assert.equal(map.finalPlan.generatedAt, NOW)
  assert.equal(map.updatedAt, LATER)

  map = applyDirectOps(map, { type: 'return-to-exploring' }, { now: NOW })
  assert.equal(map.phase, 'exploring')
})

test('legacy Plan reads create v2 memory values and the next write preserves historical events', () => {
  const raw = legacyPlannedMap([false, false])
  const events = frozen([{ type: 'brainstorm/map', data: { map: raw } }])
  const before = JSON.stringify(events)
  const normalized = latestMap(events, { now: LATER })
  assert.equal(normalized.finalPlan.version, 2)
  assert.equal(normalized.finalPlan.items, undefined)
  assert.equal(normalized.finalPlan.graph.startNodeId, 'old-1')
  assert.equal(normalized.finalPlan.graph.edges[0].to, 'old-2')
  assert.equal(normalized.executionRun, undefined)
  assert.equal(normalized.finalPlan.generatedAt, NOW)
  assert.deepEqual(normalized.finalPlan.uncovered, raw.finalPlan.uncovered)
  const edited = applyDirectOps(raw, { type: 'set-execution-node-title', nodeId: 'old-1', title: 'Edited in v2' }, { now: LATER })
  assert.equal(edited.finalPlan.version, 2)
  assert.equal(edited.finalPlan.items, undefined)
  assert.equal(edited.finalPlan.graph.nodes[0].title, 'Edited in v2')
  assert.equal(edited.finalPlan.generatedAt, NOW)
  assert.equal(JSON.stringify(events), before)
})

test('legacy done migration handles prefixes, non-contiguous completion and fully completed Plans', () => {
  const cases = [
    { done: [true, false, false], status: 'ready', current: 'old-2' },
    { done: [false, true, false], status: 'ready', current: 'old-1' },
    { done: [true, true, true], status: 'completed', current: undefined },
  ]
  for (const { done, status, current } of cases) {
    const raw = frozen(legacyPlannedMap(done))
    const original = JSON.stringify(raw)
    const map = normalizeMap(raw, { now: LATER })
    assert.equal(map.finalPlan.version, 2)
    assert.equal(map.executionRun.status, status)
    assert.equal(map.executionRun.currentNodeId, current)
    assert.deepEqual(map.executionRun, normalizeMap(raw, { now: NOW }).executionRun)
    done.forEach((isDone, index) => {
      const id = `old-${index + 1}`
      assert.equal(map.executionRun.nodeStates[id].status, isDone ? 'completed' : id === current ? 'ready' : 'pending')
    })
    assert.equal(JSON.stringify(raw), original)
    assert.doesNotThrow(() => validateMap(map))
  }
})

test('next Run write after non-contiguous legacy migration skips previously completed nodes', () => {
  const raw = frozen(legacyPlannedMap([false, true, false]))
  const original = JSON.stringify(raw)
  const running = applyDirectOps(raw, { type: 'begin-execution-node', nodeId: 'old-1' }, { now: LATER })
  const next = applyExecutionResult(running, { runId: running.executionRun.id, nodeId: 'old-1', outcome: 'completed', summary: '第一步已完成' }, { now: LATER })
  assert.equal(next.executionRun.currentNodeId, 'old-3')
  assert.equal(next.executionRun.nodeStates['old-2'].status, 'completed')
  assert.equal(next.executionRun.nodeStates['old-2'].attempts, 0)
  assert.equal(next.finalPlan.version, 2)
  assert.equal(next.finalPlan.items, undefined)
  assert.equal(JSON.stringify(raw), original)
  assert.deepEqual(normalizeMap(JSON.parse(JSON.stringify(next)), { now: LATER }), next)
})

test('exploring Map normalization discards Plan and Run and validation rejects persisted Run', () => {
  const planned = applyFinalPlan(selectedMap(), { graph: executionGraph() }, { now: NOW })
  const started = applyDirectOps(planned, { type: 'start-execution-run' }, { now: NOW, id: 'run-exploring' })
  const exploring = normalizeMap({ ...started, phase: 'exploring' }, { now: LATER })
  assert.equal(exploring.finalPlan, undefined)
  assert.equal(exploring.executionRun, undefined)
  assert.equal(exploring.nodes[0].status, 'expanded')
  assert.deepEqual(exploring.selectedIds, ['a'])
  assert.throws(() => validateMap({ ...exploring, executionRun: started.executionRun }), /must not carry an Execution Run/)
  assert.throws(() => applyDirectOps(exploring, { type: 'start-execution-run' }, { now: LATER }), /Final Plan v2/)
  assert.throws(() => applyExecutionResult(exploring, { runId: 'run-exploring', nodeId: 'exec-a', outcome: 'completed', summary: 'late' }), /requires a Final Plan/)
})

test('Run Direct Ops start, reset, retry and cancel without mutating the Plan', () => {
  const planned = applyFinalPlan(selectedMap(), { graph: executionGraph() }, { now: NOW })
  const originalPlan = JSON.stringify(planned.finalPlan)
  let map = applyDirectOps(planned, { type: 'start-execution-run' }, { now: NOW, id: 'run-direct' })
  assert.equal(map.executionRun.status, 'ready')
  assert.equal(map.executionRun.id, 'run-direct')
  map = applyDirectOps(map, { type: 'begin-execution-node', nodeId: 'exec-a' }, { now: NOW })
  map = applyDirectOps(map, { type: 'reset-execution-node', nodeId: 'exec-a', reason: 'Prompt 入队失败' }, { now: LATER })
  assert.equal(map.executionRun.status, 'ready')
  assert.equal(map.executionRun.nodeStates['exec-a'].attempts, 1)
  assert.equal(map.executionRun.nodeStates['exec-a'].summary, 'Prompt 入队失败')
  map = applyDirectOps(map, { type: 'begin-execution-node', nodeId: 'exec-a' }, { now: LATER })
  map = applyExecutionResult(map, { runId: map.executionRun.id, nodeId: 'exec-a', outcome: 'failed', summary: '测试失败' }, { now: LATER })
  assert.equal(map.executionRun.status, 'blocked')
  map = applyDirectOps(map, { type: 'retry-execution-node', nodeId: 'exec-a' }, { now: LATER })
  assert.equal(map.executionRun.status, 'ready')
  assert.equal(map.executionRun.nodeStates['exec-a'].attempts, 2)
  map = applyDirectOps(map, { type: 'begin-execution-node', nodeId: 'exec-a' }, { now: LATER })
  assert.equal(map.executionRun.nodeStates['exec-a'].attempts, 3)
  const cancelled = applyDirectOps(map, { type: 'cancel-execution-run' }, { now: LATER })
  assert.equal(cancelled.executionRun.status, 'cancelled')
  assert.equal(cancelled.phase, 'executing')
  assert.equal(JSON.stringify(cancelled.finalPlan), originalPlan)
  assert.equal(map.executionRun.status, 'running')
  const restarted = applyDirectOps(cancelled, { type: 'start-execution-run' }, { now: LATER, id: 'run-new' })
  assert.equal(restarted.executionRun.id, 'run-new')
  assert.equal(restarted.executionRun.nodeStates['exec-a'].attempts, 0)
})

test('Map completion reaches a Checkpoint and only the approval Direct Op finishes it', () => {
  const graph = executionGraph([
    { id: 'exec-a', sourceNodeIds: ['a'], title: 'Work', instruction: 'Produce draft' },
    { id: 'approve', kind: 'checkpoint', sourceNodeIds: ['a'], title: 'Approval', instruction: 'User reviews draft' },
  ])
  let map = applyFinalPlan(selectedMap(), { graph }, { now: NOW })
  map = applyDirectOps(map, [{ type: 'start-execution-run' }, { type: 'begin-execution-node', nodeId: 'exec-a' }], { now: NOW, id: 'run-approval' })
  const completedArgs = { runId: map.executionRun.id, nodeId: 'exec-a', outcome: 'completed', summary: 'Draft ready', outputRefs: ['draft.md'] }
  map = applyExecutionResult(map, completedArgs, { now: LATER })
  assert.equal(map.executionRun.status, 'waiting')
  assert.equal(map.executionRun.currentNodeId, 'approve')
  assert.throws(() => applyExecutionResult(map, { ...completedArgs, nodeId: 'approve' }, { now: LATER }), /Agent cannot complete a checkpoint/)
  map = applyDirectOps(map, { type: 'approve-execution-checkpoint', nodeId: 'approve' }, { now: LATER })
  assert.equal(map.executionRun.status, 'completed')
  assert.equal(map.executionRun.currentNodeId, undefined)
  assert.equal(map.executionRun.nodeStates.approve.summary, '用户已批准')
  assert.deepEqual(normalizeMap(JSON.parse(JSON.stringify(map)), { now: LATER }), map)
})

test('Execution specifications freeze after Run start and active Runs reject regeneration', () => {
  const planned = applyFinalPlan(selectedMap(), { graph: executionGraph() }, { now: NOW })
  const ready = applyDirectOps(planned, { type: 'start-execution-run' }, { now: NOW, id: 'run-frozen' })
  const running = applyDirectOps(ready, { type: 'begin-execution-node', nodeId: 'exec-a' }, { now: NOW })
  const blocked = applyExecutionResult(running, { runId: running.executionRun.id, nodeId: 'exec-a', outcome: 'blocked', summary: 'Need input' }, { now: LATER })
  const checkpointPlan = applyFinalPlan(selectedMap(), { graph: executionGraph([{ id: 'approve', kind: 'checkpoint', title: 'Approve', instruction: 'Review', sourceNodeIds: ['a'] }]) }, { now: NOW })
  const waiting = applyDirectOps(checkpointPlan, { type: 'start-execution-run' }, { now: NOW, id: 'run-waiting' })
  for (const map of [ready, running, blocked, waiting]) assert.throws(() => applyFinalPlan(map, { graph: executionGraph() }, { now: LATER }), /active Execution Run/)
  const edits = [
    { type: 'set-execution-node-title', nodeId: 'exec-a', title: 'Changed' },
    { type: 'set-execution-node-instruction', nodeId: 'exec-a', instruction: 'Changed' },
    { type: 'set-execution-node-criteria', nodeId: 'exec-a', completionCriteria: ['Changed'] },
    { type: 'set-execution-node-inputs', nodeId: 'exec-a', requiredInputs: ['changed.md'] },
    { type: 'set-execution-node-outputs', nodeId: 'exec-a', expectedOutputs: ['changed.md'] },
  ]
  for (const operation of edits) assert.throws(() => applyDirectOps(ready, operation, { now: LATER }), /Run has started/)
  assert.throws(() => applyOps(running, { upsertNodes: [{ id: 'a', title: 'Agent rewrite' }] }, { now: LATER }), /cannot change an executing map/)
  const cancelled = applyDirectOps(running, { type: 'cancel-execution-run' }, { now: LATER })
  assert.throws(() => applyDirectOps(cancelled, edits[0], { now: LATER }), /Run has started/)
  const regenerated = applyFinalPlan(cancelled, { graph: executionGraph() }, { now: LATER })
  assert.equal(regenerated.executionRun, undefined)
  assert.equal(regenerated.finalPlan.generatedAt, LATER)
  assert.doesNotThrow(() => applyDirectOps(regenerated, edits[0], { now: LATER }))
})

test('toggle selection and reset layout are direct operations', () => {
  let map = applyOps(null, {
    topic: 'T',
    upsertNodes: [{ id: 'a', title: 'A' }],
  }, { now: NOW }).map
  map = applyDirectOps(map, [
    { type: 'toggle-selection', nodeId: 'a', selected: true },
    { type: 'set-offset', nodeId: 'a', dx: 12, dy: 12 },
    { type: 'set-size', nodeId: 'a', w: 200, h: 80 },
  ], { now: NOW })
  map = applyDirectOps(map, { type: 'reset-layout', nodeIds: ['a'] }, { now: NOW })

  assert.deepEqual(map.selectedIds, ['a'])
  assert.deepEqual(map.layout, { offsets: {}, sizes: {} })
})

test('create-child Direct Op adds one user node and stays idempotent', () => {
  let map = applyOps(null, {
    topic: 'T',
    upsertNodes: [{ id: 'a', title: 'A' }],
  }, { now: NOW }).map

  map = applyDirectOps(map, { type: 'create-child', parentId: 'a', title: 'Manual idea', note: 'A concrete note' }, { now: NOW })
  const childId = makeNodeId('Manual idea', 'a')
  assert.deepEqual(map.nodes.find((node) => node.id === childId), {
    id: childId,
    title: 'Manual idea',
    note: 'A concrete note',
    status: 'unexplored',
    source: 'user',
    createdAt: NOW,
    updatedAt: NOW,
  })
  assert.ok(map.links.some((link) => link.from === 'a' && link.to === childId && link.kind === 'parent'))

  map = applyDirectOps(map, { type: 'create-child', parentId: 'a', title: 'Manual idea' }, { now: NOW })
  assert.equal(map.nodes.filter((node) => node.id === childId).length, 1)
  assert.equal(map.links.filter((link) => link.to === childId).length, 1)
})

test('parent links reject cycles and double parents', () => {
  const base = applyOps(null, {
    topic: 'T',
    upsertNodes: [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
      { id: 'c', title: 'C' },
    ],
    upsertLinks: [
      { from: 'a', to: 'b', kind: 'parent' },
      { from: 'b', to: 'c', kind: 'parent' },
    ],
  }, { now: NOW }).map

  assert.throws(() => applyOps(base, { upsertLinks: [{ from: 'c', to: 'a', kind: 'parent' }] }, { now: NOW }), /cycle/)
  assert.throws(() => applyOps(base, { upsertLinks: [{ from: 'a', to: 'c', kind: 'parent' }] }, { now: NOW }), /more than one parent/)
})

test('node removal clears links, selection and layout references', () => {
  const first = applyOps(null, {
    topic: 'T',
    upsertNodes: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
    upsertLinks: [{ from: 'a', to: 'b', kind: 'parent' }],
    selectedIds: ['b'],
    layout: { offsets: { b: { dx: 1, dy: 2 } }, sizes: { b: { w: 200, h: 80 } } },
  }, { now: NOW })
  const second = applyOps(first.map, { removeNodeIds: ['b'] }, { now: NOW })

  assert.equal(second.map.nodes.length, 1)
  assert.equal(second.map.links.length, 0)
  assert.deepEqual(second.map.selectedIds, [])
  assert.deepEqual(second.map.layout, { offsets: {}, sizes: {} })
})

test('node limit is enforced', () => {
  const many = Array.from({ length: 3 }, (_, i) => ({ id: `n${i}`, title: `N${i}` }))
  assert.throws(() => applyOps(null, { topic: 'T', upsertNodes: many }, { maxNodes: 2, now: NOW }), /limit/)
})

test('latestMap normalizes the last persisted map', () => {
  const oldMap = emptyMap('old', NOW)
  const legacy = { version: 1, topic: 'new', nodes: [], links: [], selectedIds: [] }
  const events = [
    { type: 'brainstorm/map', data: { map: oldMap } },
    { type: 'brainstorm/map', data: { map: legacy } },
  ]
  const map = latestMap(events, { now: NOW })

  assert.equal(map.topic, 'new')
  assert.equal(map.version, 2)
  assert.equal(latestMap([], { now: NOW }), null)
})

test('outline and stats use derived depth', () => {
  const map = applyOps(null, {
    topic: 'T',
    upsertNodes: [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B', parentId: 'a', note: '一句话记录' },
    ],
  }, { now: NOW }).map

  assert.match(outlineMap(map), /d2 B/)
  assert.equal(mapStats(map).depthMax, 2)
  assert.doesNotThrow(() => validateMap(map))
})
