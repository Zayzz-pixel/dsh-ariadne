import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import { AUTO_MAINTENANCE_CONTEXT, apply, applyDirectOps, exportExecution, exportFinalPlan, exportMap, finalPlanMarkdown, maintenanceContextFor } from '../lib/index.js'
import { applyOps, applyFinalPlan, latestMap } from '../lib/map-state.js'

/** Minimal cordis-ish harness double: enough to exercise registration paths. */
function makeCtx(options = {}) {
  const toolRegistry = new Map()
  const projectionUnits = new Map()
  const projectionCtx = {
    sessionProjections: {
      register(unit) {
        projectionUnits.set(unit.key, unit)
        return () => projectionUnits.delete(unit.key)
      },
    },
  }
  const settingsState = options.settings ?? { enabledSessionIds: ['session-current'] }
  const settingsWatchers = []
  const settingsRegistrations = new Map()
  const agents = options.agents ?? []
  const sessions = options.sessions ?? []
  const listeners = new Map()
  const promptContexts = new Map()
  const projectRecords = options.projectRecords ?? new Map()
  const projectTable = {
    get: (id) => projectRecords.get(id),
    entries: () => new Map(projectRecords).entries(),
    async put(id, value) { projectRecords.set(id, value) },
    async update(id, fn) {
      const next = fn(projectRecords.get(id))
      projectRecords.set(id, next)
      return next
    },
  }
  const systemPrompt = {
    context(entry) {
      promptContexts.set(entry.name, entry)
      return () => promptContexts.delete(entry.name)
    },
  }
  const ctx = {
    tools: {
      register(definition) {
        toolRegistry.set(definition.name, definition)
        return () => toolRegistry.delete(definition.name)
      },
    },
    sessions: {
      list: () => sessions,
      get: (id) => sessions.find((session) => session.id === id),
    },
    storageDomain: {
      async open() {
        return { table: () => projectTable, async close() {} }
      },
    },
    sessionPersistence: options.sessionPersistence ?? {
      async list() { return [] },
      async inspect() { throw new Error('session not found') },
    },
    settings: {
      register(namespace, schema, registration) {
        settingsRegistrations.set(namespace, { schema, ...registration })
        registration?.validate?.(settingsState)
        return {
          get: () => settingsState,
          watch(fn) {
            settingsWatchers.push(fn)
            return () => {}
          },
        }
      },
    },
    agents: {
      list: () => agents,
      get: (id) => agents.find((agent) => agent.id === id),
    },
    on(event, callback) {
      const list = listeners.get(event) ?? []
      list.push(callback)
      listeners.set(event, list)
      return () => {}
    },
    effect(factory) {
      factory()
      return () => {}
    },
    // Cordis `ctx.inject` activates the child immediately when the dependency is present.
    inject(deps, callback) {
      if (deps.includes('sessionProjections')) callback(projectionCtx)
      if (deps.includes('systemPrompt')) callback({ systemPrompt })
      return () => {}
    },
  }
  return { ctx, toolRegistry, projectionUnits, promptContexts, settingsState, settingsWatchers, settingsRegistrations, listeners, projectRecords }
}

function makeExec(mapEvents = [], cwd = '/ws') {
  const events = [...mapEvents]
  const session = {
    id: 'session-current',
    header: { cwd },
    events,
    append(type, data) {
      events.push({ type, data })
    },
  }
  return {
    agent: { id: session.id, session, status: 'idle', inbox: { hasPending: false } },
    signal: new AbortController().signal,
    concludedTurns: 0,
    concludeTurn() { this.concludedTurns++ },
  }
}

function executionNode(id, kind = 'task') {
  return { id, kind, title: id, instruction: `Do ${id}`, sourceNodeIds: ['a'], completionCriteria: [`Check ${id}`] }
}

function linearGraph(ids = ['deliver']) {
  return {
    startNodeId: ids[0],
    nodes: ids.map((id) => executionNode(id)),
    edges: ids.slice(1).map((id, index) => ({ id: `edge-${index}`, from: ids[index], to: id, condition: 'success' })),
  }
}

function executionFixture(graph = linearGraph(), options = {}) {
  const initial = applyOps(null, {
    topic: 'Execution fixture', upsertNodes: [{ id: 'a', title: 'Selected direction', note: 'Source context' }], selectedIds: ['a'],
  }).map
  const plan = applyFinalPlan(initial, { graph, uncovered: [] })
  const exec = makeExec([{ type: 'brainstorm/map', data: { map: plan } }], options.cwd)
  const fixture = makeCtx({ sessions: [exec.agent.session], agents: [exec.agent] })
  apply(fixture.ctx)
  const settingsScope = { get: () => fixture.settingsState }
  const direct = (ops) => applyDirectOps(settingsScope, fixture.ctx.sessions, exec.agent.id, ops, { agent: exec.agent })
  const current = () => latestMap(exec.agent.session.events)
  if (options.start !== false) direct({ type: 'start-execution-run' })
  const complete = (args = {}) => fixture.toolRegistry.get('brainstorm_execution_complete').execute({
    runId: current().executionRun?.id, nodeId: current().executionRun?.currentNodeId,
    outcome: 'completed', summary: 'Checked result', ...args,
  }, exec)
  return { ...fixture, exec, settingsScope, direct, current, complete }
}

async function temporaryDirectory(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'brainstorm-tools-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  return directory
}

test('apply registers tools, projections, and the maintenance prompt context', () => {
  const { ctx, toolRegistry, projectionUnits, promptContexts } = makeCtx()
  apply(ctx)
  assert.ok(toolRegistry.has('brainstorm_map'))
  assert.ok(toolRegistry.has('brainstorm_project'))
  assert.ok(toolRegistry.has('brainstorm_plan'))
  assert.ok(toolRegistry.has('brainstorm_execution_complete'))
  assert.ok(projectionUnits.has('brainstorm'))
  assert.ok(projectionUnits.has('brainstorm.project'))
  assert.ok(projectionUnits.get('brainstorm').stateSchema, '0.1.1 projection uses stateSchema')
  assert.ok(projectionUnits.get('brainstorm').wire?.viewSchema, '0.1.1 client projection declares wire.viewSchema')
  assert.equal(projectionUnits.get('brainstorm').stateVersion, 4)
  assert.equal(projectionUnits.get('brainstorm.project').stateVersion, 5)
  assert.ok(promptContexts.has('brainstorm:auto-maintenance'))
  assert.match(toolRegistry.get('brainstorm_map').description, /ordinary chat/)
  assert.equal(toolRegistry.get('brainstorm_map').parameters.properties.upsertNodes.items.properties.userNote, undefined, 'Agent tool cannot write personal notes')
  const maintenance = promptContexts.get('brainstorm:auto-maintenance').text({ agent: { session: { id: 'session-current', events: [] } } })
  assert.match(maintenance, /Ariadne is enabled/)
  assert.equal(KNOWN_SESSION_EVENT_TYPES.has('brainstorm/map'), true)
  assert.equal(KNOWN_SESSION_EVENT_TYPES.has('brainstorm/project'), true)
})

test('maintenance context is scoped to enabled Ariadne sessions', () => {
  const agent = { session: { id: 'session-current', events: [] } }
  assert.equal(maintenanceContextFor(agent, false), '')
  const text = maintenanceContextFor(agent, true)
  assert.match(text, /at most 3/)
  assert.match(text, /at most 5 direct children/)
  assert.match(text, /No map exists yet/)
  assert.match(AUTO_MAINTENANCE_CONTEXT, /Do not call brainstorm_map for ordinary chat/)
  assert.match(AUTO_MAINTENANCE_CONTEXT, /Under one Parent, children should answer the same kind of question/)
  assert.match(AUTO_MAINTENANCE_CONTEXT, /Preserve the user's existing hierarchy and naming/)

  const framed = maintenanceContextFor({ session: { events: [{ type: 'brainstorm/map', data: { map: { version: 2, topic: 'T', frame: { goal: '选出方案', organizingPrinciple: '按约束与价值组织' }, phase: 'exploring', nodes: [], links: [], selectedIds: [], layout: { offsets: {}, sizes: {} }, createdAt: 'x', updatedAt: 'x' } } }] } }, true)
  assert.match(framed, /Goal: 选出方案/)
  assert.match(framed, /Organizing principle: 按约束与价值组织/)

  const { ctx, promptContexts } = makeCtx({ settings: { enabledSessionIds: [] } })
  apply(ctx)
  const provider = promptContexts.get('brainstorm:auto-maintenance')
  assert.equal(provider.text({ agent }), '')
})

test('projection folds the last brainstorm/map event, ignores others', () => {
  const { ctx, projectionUnits } = makeCtx()
  apply(ctx)
  const unit = projectionUnits.get('brainstorm')
  let state = unit.init()
  state = unit.apply(state, { type: 'user/message' })
  assert.equal(state, null)
  const map = { version: 1, topic: 'T', nodes: [], links: [], selectedIds: [] }
  state = unit.apply(state, { type: 'brainstorm/map', data: { map } })
  assert.equal(unit.wire.view(state).version, 2)
  assert.equal(unit.wire.view(state).topic, 'T')
  assert.equal(unit.wire.view(state).phase, 'exploring')
})

test('execute applies ops, appends a complete event, and reports changes', async () => {
  const { ctx, toolRegistry } = makeCtx()
  apply(ctx)
  const tool = toolRegistry.get('brainstorm_map')
  const exec = makeExec([])
  const result = await tool.execute(
    {
      topic: '脑暴插件',
      frame: { goal: '形成可安装插件', organizingPrinciple: '按产品价值与实现约束组织' },
      upsertNodes: [{ id: 'shape', title: '插件形态', source: 'user' }],
      upsertLinks: [],
      selectedIds: ['shape'],
    },
    exec,
  )
  assert.equal(result.ok, true)
  assert.equal(result.changes.nodesAdded, 1)
  assert.match(result.message, /1 nodes/)
  const appended = exec.agent.session.events.at(-1)
  assert.equal(appended.type, 'brainstorm/map')
  assert.equal(appended.data.map.version, 2)
  assert.equal(appended.data.map.nodes[0].title, '插件形态')
  assert.deepEqual(appended.data.map.frame, { goal: '形成可安装插件', organizingPrinciple: '按产品价值与实现约束组织' })
  assert.equal('depth' in appended.data.map.nodes[0], false)
  assert.deepEqual(appended.data.map.selectedIds, ['shape'])
})

test('execute merges incremental ops into the existing map', async () => {
  const { ctx, toolRegistry } = makeCtx()
  apply(ctx)
  const tool = toolRegistry.get('brainstorm_map')
  const first = makeExec([])
  await tool.execute({ topic: 'T', upsertNodes: [{ id: 'a', title: 'A' }] }, first)
  const second = makeExec(first.agent.session.events)
  const result = await tool.execute(
    { upsertNodes: [{ id: 'b', title: 'B', parentId: 'a' }] },
    second,
  )
  assert.equal(result.changes.nodesAdded, 1)
  assert.equal(result.changes.linksAdded, 1)
  assert.equal(second.agent.session.events.filter((e) => e.type === 'brainstorm/map').length, 2)
  assert.equal(second.agent.session.events.at(-1).data.map.nodes.length, 2)
})

test('execute rejects a call without an owning agent', async () => {
  const { ctx, toolRegistry } = makeCtx()
  apply(ctx)
  const tool = toolRegistry.get('brainstorm_map')
  await assert.rejects(() => tool.execute({ topic: 'T' }, { agent: null }), /owning agent/)
})

test('project tool persists metadata, reads cold sessions, and appends the overview', async () => {
  const exec = makeExec([{ type: 'brainstorm/map', data: { map: { version: 1, topic: 'T1', nodes: [{ id: 'a', title: 'A', status: 'unexplored', depth: 0, source: 'user', createdAt: 'x', updatedAt: 'x' }], links: [], selectedIds: [], createdAt: 'x', updatedAt: 'x' } } }])
  const persistence = {
    async list() { return [{ id: 'session-current', cwd: '/ws' }, { id: 's2', cwd: '/other' }] },
    async inspect(id) {
      assert.equal(id, 'session-current')
      return { events: exec.agent.session.events }
    },
  }
  const { ctx, toolRegistry, projectRecords } = makeCtx({ sessionPersistence: persistence })
  apply(ctx)
  const tool = toolRegistry.get('brainstorm_project')
  const result = await tool.execute({}, exec)
  assert.equal(result.ok, true)
  assert.equal(result.totals.sessions, 1)
  assert.equal(result.totals.nodes, 1)
  assert.equal(result.totals.unexplored, 1)
  assert.equal(result.totals.roots, 1)
  assert.equal(projectRecords.size, 1)
  assert.match(result.projectId, /^project-/)
  assert.equal(exec.agent.session.events.filter((event) => event.type === 'brainstorm/map').at(-1).data.map.projectId, result.projectId)
  const appended = exec.agent.session.events.at(-1)
  assert.equal(appended.type, 'brainstorm/project')
  assert.equal(appended.data.project.sessions[0].sessionId, 'session-current')
})

test('plan tool writes a reviewable Graph v2 and exports edits and completed Run results', async (t) => {
  const { ctx, toolRegistry } = makeCtx()
  apply(ctx)
  const mapTool = toolRegistry.get('brainstorm_map')
  const exec = makeExec([])
  await mapTool.execute(
    {
      topic: '脑暴插件',
      upsertNodes: [
        { id: 'a', title: '插件形态', status: 'expanded', note: '做 DSH web 插件' },
        { id: 'b', title: '数据格式', status: 'unexplored' },
      ],
      selectedIds: ['a'],
    },
    exec,
  )
  const planTool = toolRegistry.get('brainstorm_plan')
  const out = path.join(await temporaryDirectory(t), 'brainstorm-execution.md')
  const planExec = makeExec(exec.agent.session.events)
  const graph = linearGraph()
  graph.nodes[0].title = '交付插件'
  graph.nodes[0].instruction = '在 DSH Web 完成验收'
  const result = await planTool.execute({
    graph,
    uncovered: [{ title: '数据格式', reason: '尚未展开' }],
    outputPath: out,
  }, planExec)
  assert.equal(result.ok, true)
  assert.equal(result.selectedCount, 1)
  assert.equal(result.uncoveredCount, 1)
  assert.match(result.plan, /Execution Graph/)
  assert.match(result.plan, /```mermaid/)
  assert.match(result.plan, /在 DSH Web 完成验收/)
  assert.match(result.plan, /数据格式/)
  const mapEvents = planExec.agent.session.events.filter((e) => e.type === 'brainstorm/map')
  const appended = mapEvents.at(-1)
  assert.equal(appended.data.map.phase, 'executing')
  assert.equal(appended.data.map.nodes.find((n) => n.id === 'a').status, 'selected')
  assert.equal(appended.data.map.finalPlan.version, 2)
  assert.equal(appended.data.map.finalPlan.graph.nodes[0].instruction, '在 DSH Web 完成验收')
  assert.equal(appended.data.map.finalPlan.items, undefined)
  assert.equal(appended.data.map.executionRun, undefined, 'plan generation does not start execution')
  assert.match(await fs.readFile(out, 'utf8'), /## Execution Graph/)

  const settingsScope = { get: () => ({ enabledSessionIds: ['session-current'] }) }
  const sessions = { get: (id) => id === 'session-current' ? planExec.agent.session : undefined }
  const generatedAt = appended.data.map.finalPlan.generatedAt
  applyDirectOps(settingsScope, sessions, 'session-current', [
    { type: 'set-execution-node-title', nodeId: 'deliver', title: '交付可用插件' },
    { type: 'set-execution-node-instruction', nodeId: 'deliver', instruction: '打开 DSH Web 执行真实验收' },
    { type: 'set-execution-node-criteria', nodeId: 'deliver', completionCriteria: ['验收通过'] },
    { type: 'set-execution-node-inputs', nodeId: 'deliver', requiredInputs: ['已安装插件'] },
    { type: 'set-execution-node-outputs', nodeId: 'deliver', expectedOutputs: ['验收记录'] },
  ])
  assert.equal(latestMap(planExec.agent.session.events).finalPlan.generatedAt, generatedAt)
  applyDirectOps(settingsScope, sessions, 'session-current', [
    { type: 'start-execution-run' }, { type: 'begin-execution-node', nodeId: 'deliver' },
  ], { agent: planExec.agent })
  await toolRegistry.get('brainstorm_execution_complete').execute({
    runId: latestMap(planExec.agent.session.events).executionRun.id, nodeId: 'deliver',
    outcome: 'completed', summary: '验收通过', evidence: ['页面与工具可用'],
  }, planExec)
  const beforeExport = JSON.stringify(planExec.agent.session.events)
  const exported = await exportFinalPlan(settingsScope, sessions, 'session-current', out)
  const current = planExec.agent.session.events.at(-1).data.map
  assert.equal(exported.plan, finalPlanMarkdown(current), 'deterministic export matches the current Final Plan exactly')
  assert.equal(await fs.readFile(out, 'utf8'), exported.plan)
  assert.match(exported.plan, /交付可用插件/)
  assert.match(exported.plan, /打开 DSH Web 执行真实验收/)
  assert.match(exported.plan, /已完成/)
  assert.equal(planExec.concludedTurns, 1)
  assert.equal(JSON.stringify(planExec.agent.session.events), beforeExport)
})

test('plan tool rejects when nothing is selected', async () => {
  const { ctx, toolRegistry } = makeCtx()
  apply(ctx)
  const mapTool = toolRegistry.get('brainstorm_map')
  const exec = makeExec([])
  await mapTool.execute({ topic: 'T', upsertNodes: [{ id: 'a', title: 'A' }] }, exec)
  const planTool = toolRegistry.get('brainstorm_plan')
  await assert.rejects(
    () => planTool.execute({
      graph: linearGraph(),
      outputPath: `${process.env.TMPDIR ?? '/tmp'}/none.md`,
    }, makeExec(exec.agent.session.events)),
    /at least one selected/,
  )
})

test('execution completion validates owning Session, current Run/node and running state without appending on refusal', async () => {
  const f = executionFixture(linearGraph(['deliver', 'verify']))
  const tool = f.toolRegistry.get('brainstorm_execution_complete')
  const args = { runId: f.current().executionRun.id, nodeId: 'deliver', outcome: 'completed', summary: 'Done' }
  await assert.rejects(() => tool.execute(args, { agent: null }), /owning agent/)
  await assert.rejects(() => tool.execute(args, makeExec()), /existing map/)
  const beforeBegin = JSON.stringify(f.exec.agent.session.events)
  await assert.rejects(() => f.complete(), /must be running/)
  assert.equal(JSON.stringify(f.exec.agent.session.events), beforeBegin)
  f.direct({ type: 'begin-execution-node', nodeId: 'deliver' })
  const before = JSON.stringify(f.exec.agent.session.events)
  for (const [patch, message] of [
    [{ runId: 'stale-run' }, /runId does not match/],
    [{ nodeId: 'verify' }, /currentNodeId/],
    [{ summary: ' ' }, /summary must be non-empty/],
    [{ routeKey: 'passed' }, /only for a completed decision/],
  ]) {
    await assert.rejects(() => f.complete(patch), message)
    assert.equal(JSON.stringify(f.exec.agent.session.events), before)
  }
  assert.equal(f.exec.concludedTurns, 0)
})

test('execution completion advances success once, retains evidence and concludes each Agent turn', async () => {
  const f = executionFixture(linearGraph(['deliver', 'verify']))
  const plan = structuredClone(f.current().finalPlan)
  f.direct({ type: 'begin-execution-node', nodeId: 'deliver' })
  const result = await f.complete({ outputRefs: ['deliverable.md'], evidence: ['Acceptance checked'] })
  assert.equal(result.ok, true)
  assert.equal(result.status, 'ready')
  assert.equal(result.currentNodeId, 'verify')
  assert.equal(f.current().executionRun.nodeStates.verify.status, 'ready')
  assert.deepEqual(f.current().executionRun.nodeStates.deliver.outputRefs, ['deliverable.md'])
  assert.deepEqual(f.current().executionRun.nodeStates.deliver.evidence, ['Acceptance checked'])
  assert.equal(f.exec.concludedTurns, 1)
  const before = f.exec.agent.session.events.length
  await assert.rejects(() => f.complete({ nodeId: 'deliver' }), /currentNodeId/)
  assert.equal(f.exec.agent.session.events.length, before)
  f.direct({ type: 'begin-execution-node', nodeId: 'verify' })
  const finished = await f.complete()
  assert.equal(finished.status, 'completed')
  assert.equal(finished.currentNodeId, '')
  assert.equal(f.exec.concludedTurns, 2)
  assert.deepEqual(f.current().finalPlan, plan, 'Run progress leaves the graph unchanged')
})

test('failed execution follows its failure edge and leaves the success branch pending', async () => {
  const graph = {
    startNodeId: 'deliver', nodes: ['deliver', 'passed', 'repair'].map((id) => executionNode(id)),
    edges: [
      { id: 'success', from: 'deliver', to: 'passed', condition: 'success' },
      { id: 'failure', from: 'deliver', to: 'repair', condition: 'failure' },
    ],
  }
  const f = executionFixture(graph)
  f.direct({ type: 'begin-execution-node', nodeId: 'deliver' })
  const result = await f.complete({ outcome: 'failed', summary: 'Acceptance failed' })
  assert.equal(result.status, 'ready')
  assert.equal(result.currentNodeId, 'repair')
  assert.equal(f.current().executionRun.nodeStates.deliver.status, 'failed')
  assert.equal(f.current().executionRun.nodeStates.passed.status, 'pending')
  assert.equal(f.exec.concludedTurns, 1)
})

test('failed terminal tasks and blocked results wait for an explicit retry', async () => {
  for (const outcome of ['failed', 'blocked']) {
    const f = executionFixture()
    f.direct({ type: 'begin-execution-node', nodeId: 'deliver' })
    assert.equal((await f.complete({ outcome, summary: 'Needs user input' })).status, 'blocked')
    assert.equal(f.current().executionRun.nodeStates.deliver.status, outcome)
    f.direct({ type: 'retry-execution-node', nodeId: 'deliver' })
    assert.equal(f.current().executionRun.status, 'ready')
    assert.equal(f.current().executionRun.nodeStates.deliver.attempts, 1)
    f.direct({ type: 'begin-execution-node', nodeId: 'deliver' })
    assert.equal(f.current().executionRun.nodeStates.deliver.attempts, 2)
  }
})

test('Decision completion requires an allowed routeKey and takes only that route', async () => {
  const graph = {
    startNodeId: 'decide', nodes: [executionNode('decide', 'decision'), executionNode('passed'), executionNode('repair')],
    edges: [
      { id: 'pass', from: 'decide', to: 'passed', condition: 'route', routeKey: 'passed' },
      { id: 'repair', from: 'decide', to: 'repair', condition: 'route', routeKey: 'needs_repair' },
    ],
  }
  const f = executionFixture(graph)
  f.direct({ type: 'begin-execution-node', nodeId: 'decide' })
  const before = JSON.stringify(f.exec.agent.session.events)
  await assert.rejects(() => f.complete(), /routeKey/)
  await assert.rejects(() => f.complete({ routeKey: 'unknown' }), /allowed route/)
  assert.equal(JSON.stringify(f.exec.agent.session.events), before)
  const result = await f.complete({ routeKey: 'needs_repair' })
  assert.equal(result.currentNodeId, 'repair')
  assert.equal(f.current().executionRun.nodeStates.decide.routeKey, 'needs_repair')
  assert.equal(f.current().executionRun.nodeStates.passed.status, 'pending')
  assert.equal(f.exec.concludedTurns, 1)
})

test('only a user Direct Op can approve the current Checkpoint', async () => {
  const graph = {
    startNodeId: 'review', nodes: [executionNode('review', 'checkpoint'), executionNode('deliver')],
    edges: [{ id: 'approved', from: 'review', to: 'deliver', condition: 'success' }],
  }
  const f = executionFixture(graph)
  const before = JSON.stringify(f.exec.agent.session.events)
  await assert.rejects(() => f.complete(), /Agent cannot complete a checkpoint/)
  assert.throws(() => f.direct({ type: 'begin-execution-node', nodeId: 'review' }), /user approval/)
  assert.equal(JSON.stringify(f.exec.agent.session.events), before)
  assert.equal(f.exec.concludedTurns, 0)
  f.direct({ type: 'approve-execution-checkpoint', nodeId: 'review' })
  assert.equal(f.current().executionRun.currentNodeId, 'deliver')
  assert.equal(f.current().executionRun.nodeStates.review.summary, '用户已批准')
  assert.equal(f.current().executionRun.nodeStates.review.status, 'completed')
})

test('Host Begin and reset require an idle Agent and an empty message queue', () => {
  const f = executionFixture()
  const before = JSON.stringify(f.exec.agent.session.events)
  for (const [status, hasPending] of [['running', false], ['idle', true]]) {
    f.exec.agent.status = status
    f.exec.agent.inbox.hasPending = hasPending
    assert.throws(() => f.direct({ type: 'begin-execution-node', nodeId: 'deliver' }), /等待空闲/)
    assert.equal(JSON.stringify(f.exec.agent.session.events), before)
  }
  f.exec.agent.status = 'idle'
  f.exec.agent.inbox.hasPending = false
  f.direct({ type: 'begin-execution-node', nodeId: 'deliver' })
  assert.equal(f.current().executionRun.status, 'running')
  f.exec.agent.status = 'running'
  assert.throws(() => f.direct({ type: 'reset-execution-node', nodeId: 'deliver' }), /等待空闲/)
  f.exec.agent.status = 'idle'
  f.direct({ type: 'reset-execution-node', nodeId: 'deliver', reason: 'Prompt rejected' })
  assert.equal(f.current().executionRun.status, 'ready')
  assert.equal(f.current().executionRun.nodeStates.deliver.attempts, 1)
})

test('Host settings validation refuses disabling ready, running, blocked and waiting Runs', async () => {
  const f = executionFixture()
  const registration = f.settingsRegistrations.get('brainstorm-map')
  const disable = () => registration.validate({ enabledSessionIds: [] })
  assert.equal(registration.applies, 'live')
  assert.throws(disable, /先取消当前 Execution Run/)
  f.direct({ type: 'begin-execution-node', nodeId: 'deliver' })
  assert.throws(disable, /先取消当前 Execution Run/)
  await f.complete({ outcome: 'blocked', summary: 'Needs approval' })
  assert.throws(disable, /先取消当前 Execution Run/)
  assert.deepEqual(f.settingsState.enabledSessionIds, ['session-current'])
  f.direct({ type: 'cancel-execution-run' })
  assert.doesNotThrow(disable)

  const waiting = executionFixture({ startNodeId: 'review', nodes: [executionNode('review', 'checkpoint')], edges: [] })
  const validate = waiting.settingsRegistrations.get('brainstorm-map').validate
  assert.throws(() => validate({ enabledSessionIds: [] }), /先取消当前 Execution Run/)
  waiting.direct({ type: 'approve-execution-checkpoint', nodeId: 'review' })
  assert.doesNotThrow(() => validate({ enabledSessionIds: [] }), 'completed Run can be disabled')
})

test('exportExecution writes Graph JSON and Mermaid Markdown without mutating Session events', async (t) => {
  const directory = await temporaryDirectory(t)
  const f = executionFixture(linearGraph(), { cwd: directory })
  f.direct({ type: 'begin-execution-node', nodeId: 'deliver' })
  await f.complete({ summary: 'Delivery checked', outputRefs: ['artifact.md'], evidence: ['Tests passed'] })
  const before = JSON.stringify(f.exec.agent.session.events)
  const result = await exportExecution(f.settingsScope, f.ctx.sessions, f.exec.agent.id, {
    format: 'both', project: { id: 'project-export', title: 'Portable plan', goal: 'Delivery' },
  })
  assert.equal(result.ok, true)
  assert.equal(result.paths.json, path.join(directory, 'brainstorm-execution.json'))
  assert.equal(result.paths.markdown, path.join(directory, 'brainstorm-execution.md'))
  const json = JSON.parse(await fs.readFile(result.paths.json, 'utf8'))
  const markdown = await fs.readFile(result.paths.markdown, 'utf8')
  assert.equal(json.schema, 'dsh.brainstorm.execution')
  assert.equal(json.version, 1)
  assert.equal(json.sessionId, 'session-current')
  assert.equal(json.projectId, 'project-export')
  assert.equal(json.project.title, 'Portable plan')
  assert.equal(json.finalPlan.version, 2)
  assert.deepEqual(json.finalPlan.graph, f.current().finalPlan.graph)
  assert.equal(json.executionRun.status, 'completed')
  assert.deepEqual(json.executionRun.nodeStates.deliver.evidence, ['Tests passed'])
  assert.match(markdown, /```mermaid\nflowchart LR/)
  assert.match(markdown, /Source context/)
  assert.match(markdown, /Delivery checked/)
  assert.match(markdown, /artifact\.md/)
  assert.equal(JSON.stringify(f.exec.agent.session.events), before)
})

test('switch: disabled agents get a deny restriction, enabled agents do not', () => {
  const calls = []
  const agent = {
    id: 'session-off',
    ctx: {
      tools: {
        restrict(filter) {
          calls.push({ filter, dispose: 0 })
          const entry = calls.at(-1)
          return () => {
            entry.dispose += 1
          }
        },
      },
    },
  }
  const { ctx, settingsState, settingsWatchers } = makeCtx({ settings: { enabledSessionIds: [] }, agents: [agent] })
  apply(ctx)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].filter.deny, ['brainstorm_map', 'brainstorm_project', 'brainstorm_plan', 'brainstorm_execution_complete'])

  // Turning the switch on lifts the restriction for every live agent.
  settingsState.enabledSessionIds = ['session-off']
  settingsWatchers.forEach((watch) => watch())
  assert.equal(calls[0].dispose, 1)
  assert.equal(calls.length, 1)
})

test('switch: agent/created listener restricts new disabled agents', () => {
  const calls = []
  const agent = {
    id: 'session-new',
    ctx: {
      tools: {
        restrict(filter) {
          calls.push(filter)
          return () => {}
        },
      },
    },
  }
  const { ctx, listeners } = makeCtx({ settings: { enabledSessionIds: [] }, agents: [] })
  apply(ctx)
  const created = listeners.get('agent/created')
  assert.ok(created?.length)
  created.forEach((fn) => fn({ agent }))
  assert.deepEqual(calls[0].deny, ['brainstorm_map', 'brainstorm_project', 'brainstorm_plan', 'brainstorm_execution_complete'])
})

test('applyDirectOps appends a full map event without an LLM turn', () => {
  const settingsScope = { get: () => ({ enabledSessionIds: ['s-direct'] }) }
  const events = []
  const sessions = {
    get: (id) => id === 's-direct' ? { events, append: (type, data) => events.push({ type, data }) } : undefined,
  }
  const result = applyDirectOps(settingsScope, sessions, 's-direct', {
    topic: 'T',
    upsertNodes: [{ id: 'a', title: 'A', status: 'expanded' }],
  })
  assert.equal(result.ok, true)
  assert.equal(result.nodeCount, 1)
  assert.equal(events.at(-1).type, 'brainstorm/map')
  assert.equal(events.at(-1).data.map.nodes[0].status, 'expanded')
})

test('applyDirectOps supports v2 frame, title, note and child operations', () => {
  const settingsScope = { get: () => ({ enabledSessionIds: ['s-direct'] }) }
  const events = []
  const session = { events, append: (type, data) => events.push({ type, data }) }
  const sessions = { get: (id) => id === 's-direct' ? session : undefined }

  applyDirectOps(settingsScope, sessions, 's-direct', {
    topic: 'T',
    upsertNodes: [{ id: 'a', title: 'A', status: 'expanded' }],
    selectedIds: ['a'],
  })
  applyDirectOps(settingsScope, sessions, 's-direct', [
    { type: 'set-frame', goal: '完成产品收敛', organizingPrinciple: '按目标与证据组织' },
    { type: 'set-title', nodeId: 'a', title: 'Updated A' },
    { type: 'set-note', nodeId: 'a', note: '详细记录' },
		{ type: 'set-user-note', nodeId: 'a', userNote: '用户自己的想法' },
		{ type: 'create-child', parentId: 'a', title: 'Manual child' },
  ])

  const map = events.at(-1).data.map
  assert.deepEqual(map.frame, { goal: '完成产品收敛', organizingPrinciple: '按目标与证据组织' })
  assert.equal(map.nodes[0].title, 'Updated A')
  assert.equal(map.nodes[0].note, '详细记录')
	assert.equal(map.nodes[0].userNote, '用户自己的想法')
	assert.equal(map.nodes[1].title, 'Manual child')
	assert.equal(map.nodes[1].source, 'user')
	assert.ok(map.links.some((link) => link.from === 'a' && link.to === map.nodes[1].id))
  assert.equal(map.version, 2)
  assert.equal(map.phase, 'exploring')
})

test('applyDirectOps rejects disabled or non-live sessions', () => {
  const settingsScope = { get: () => ({ enabledSessionIds: ['s-on'] }) }
  const sessions = { get: () => undefined }
  assert.throws(() => applyDirectOps(settingsScope, sessions, 's-off', { topic: 'T' }), /disabled/)
  assert.throws(() => applyDirectOps(settingsScope, sessions, 's-on', { topic: 'T' }), /not live/)
})

test('exportMap writes current Markdown and JSON Canvas without changing Session events', async () => {
  const settingsScope = { get: () => ({ enabledSessionIds: ['s-export'] }) }
  const map = {
    version: 2,
    topic: 'Export',
    phase: 'exploring',
    nodes: [
      { id: 'a', title: 'A', status: 'expanded', source: 'user', createdAt: 'x', updatedAt: 'x' },
      { id: 'b', title: 'B', status: 'unexplored', source: 'agent', createdAt: 'x', updatedAt: 'x' },
    ],
    links: [{ from: 'a', to: 'b', kind: 'parent' }],
    selectedIds: ['a'],
    layout: { offsets: {}, sizes: {} },
    createdAt: 'x',
    updatedAt: 'x',
  }
  const events = [{ type: 'brainstorm/map', data: { map } }]
  const fs = await import('node:fs/promises')
  const base = `${process.env.TMPDIR ?? '/tmp'}/brainstorm-export-${Date.now()}`
  const session = { header: { cwd: '/tmp' }, events }
  const sessions = { get: (id) => id === 's-export' ? session : undefined }
  const result = await exportMap(settingsScope, sessions, 's-export', {
    format: 'both',
    markdownPath: `${base}.md`,
    canvasPath: `${base}.canvas`,
    rects: { a: { x: 0, y: 0, w: 200, h: 80 }, b: { x: 320, y: 0, w: 200, h: 80 } },
  })
  assert.equal(result.nodeCount, 2)
  assert.equal(result.edgeCount, 1)
  assert.match(await fs.readFile(result.paths.markdown, 'utf8'), /# Export/)
  const canvas = JSON.parse(await fs.readFile(result.paths.canvas, 'utf8'))
  assert.equal(canvas.nodes.length, 2)
  assert.equal(canvas.edges.length, 1)
  assert.equal(events.length, 1, 'export does not append a Session event')
  await fs.unlink(result.paths.markdown)
  await fs.unlink(result.paths.canvas)
})

test('switch: tools refuse to write while the session is disabled', async () => {
  const { ctx, toolRegistry } = makeCtx({ settings: { enabledSessionIds: [] } })
  apply(ctx)
  const tool = toolRegistry.get('brainstorm_map')
  const exec = makeExec([])
  await assert.rejects(() => tool.execute({ topic: 'T' }, exec), /disabled/)
  await assert.rejects(() => toolRegistry.get('brainstorm_execution_complete').execute({
    runId: 'run-disabled', nodeId: 'deliver', outcome: 'completed', summary: 'Done',
  }, exec), /disabled/)
  assert.equal(exec.agent.session.events.length, 0)
})
