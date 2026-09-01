import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import * as brainstorm from '../lib/index.js'
import { applyOps, applyFinalPlan, latestMap } from '../lib/map-state.js'

/** Resolve the installed Harness peers from the same runtime as the plugin. */
async function loadRuntime() {
  const require = createRequire(import.meta.resolve('@deepseek-ai/dsh-tools'))
  return Promise.all([
    'cordis', 'dsh-session', 'dsh-agent', 'dsh-llm', 'dsh-system-prompt',
    'dsh-tools', 'dsh-agent-loop', 'dsh-settings',
  ].map((name) => import(pathToFileURL(require.resolve(`@deepseek-ai/${name}`)).href)))
}

function branchingPlan() {
  const node = (id, kind) => ({
    id, kind, title: id, instruction: `Complete synthetic ${id}`,
    sourceNodeIds: ['idea'], completionCriteria: [`${id} has a checkable result`],
  })
  return {
    graph: {
      startNodeId: 'prepare',
      nodes: [node('prepare', 'task'), node('decide', 'decision'),
        node('repair', 'task'), node('review', 'checkpoint'), node('finish', 'task')],
      edges: [
        { id: 'prepared', from: 'prepare', to: 'decide', condition: 'success' },
        { id: 'passed', from: 'decide', to: 'review', condition: 'route', routeKey: 'passed' },
        { id: 'needs-repair', from: 'decide', to: 'repair', condition: 'route', routeKey: 'needs_repair' },
        { id: 'repaired', from: 'repair', to: 'review', condition: 'success' },
        { id: 'approved', from: 'review', to: 'finish', condition: 'success' },
      ],
    },
    uncovered: [],
  }
}

test('real AgentLoop completes a branching Run with a user-only checkpoint', { timeout: 15_000 }, async (t) => {
  let runtime
  try {
    runtime = await loadRuntime()
  } catch (error) {
    if (!['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'].includes(error.code)) throw error
    t.skip(`Installed DSH AgentLoop runtime unavailable: ${error.message}`)
    return
  }
  const [
    { Context }, { default: Sessions }, { default: Agents },
    { default: Llm, LlmAdapter, createUserMessage }, { default: Prompt },
    { default: Tools }, { default: Loop }, { SettingsProvider },
  ] = runtime
  const sessionId = 'brainstorm-synthetic-runtime'

  class MemorySettings extends SettingsProvider {
    writable = true
    async load() { return { 'brainstorm-map': { enabledSessionIds: [sessionId] } } }
    async persist() {}
  }

  // The production AgentLoop and tool pipeline run unchanged. Only the model
  // stream and unrelated storage/web capabilities are local test fixtures.
  class SyntheticModel extends LlmAdapter {
    replies = []
    requests = 0
    async *stream(options) {
      options.signal.throwIfAborted()
      this.requests++
      const args = this.replies.shift()
      assert.ok(args, 'completion must conclude the turn before another model request')
      yield {
        type: 'block-end', index: 0,
        block: {
          type: 'tool-call', id: `synthetic-${this.requests}`,
          name: 'brainstorm_execution_complete', arguments: JSON.stringify(args),
        },
      }
      yield { type: 'finish', reason: { kind: 'tool-calls' } }
    }
  }

  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  for (const service of [Sessions, Agents, Llm, Prompt, Tools, MemorySettings]) await ctx.plugin(service)
  await ctx.plugin(Loop, { agents: [] })
  ctx.provide('webServer', { host: '127.0.0.1', port: 0, register: () => () => {} })
  ctx.provide('sessionPersistence', { async list() { return [] } })
  ctx.provide('storageDomain', {
    async open() { return { table: () => ({}), async close() {} } },
  })
  await ctx.plugin(brainstorm)
  const model = new SyntheticModel()
  ctx.llm.registerAdapter(['synthetic'], model)
  const outcomes = []
  ctx.on('tools/result', (exec, result) => {
    if (exec.name === 'brainstorm_execution_complete') {
      outcomes.push({ nodeId: exec.arguments.nodeId, sessionId: exec.agent.session.id, result })
    }
  })
  const handle = await ctx.agents.create({
    sessionId, agentOptions: { provider: 'synthetic', model: 'deterministic' },
  })
  const { agent } = handle
  const settingsScope = { get: () => ctx.settings.get(brainstorm.SETTINGS_NAMESPACE) }
  const direct = (op) => brainstorm.applyDirectOps(settingsScope, ctx.sessions, sessionId, op, { agent })
  const map = () => latestMap(agent.session.events)
  const initial = applyOps(null, {
    topic: 'Synthetic execution', upsertNodes: [{ id: 'idea', title: 'Ship a checked result' }],
    selectedIds: ['idea'],
  }).map
  agent.session.append('brainstorm/map', { map: applyFinalPlan(initial, branchingPlan()) })
  direct({ type: 'start-execution-run' })
  const runId = map().executionRun.id

  async function runNode(nodeId, routeKey) {
    assert.equal(agent.status, 'idle')
    assert.equal(agent.inbox.hasPending, false)
    direct({ type: 'begin-execution-node', nodeId })
    model.replies.push({
      runId, nodeId, outcome: 'completed', summary: `Synthetic ${nodeId} completed`,
      evidence: [`${nodeId} acceptance checked`], ...(routeKey ? { routeKey } : {}),
    })
    const before = model.requests
    agent.followup(createUserMessage({
      content: [{ type: 'text', text: `Execute only current node ${nodeId}, then call brainstorm_execution_complete.` }],
      source: { kind: 'user' },
    }))
    await agent.whenIdle()
    assert.equal(model.requests, before + 1, 'concludeTurn prevents a second model step')
    assert.equal(outcomes.at(-1)?.nodeId, nodeId)
    assert.equal(outcomes.at(-1)?.sessionId, sessionId)
    assert.equal(outcomes.at(-1)?.result.isError, false, JSON.stringify(outcomes.at(-1)?.result))
    assert.equal(outcomes.at(-1)?.result.concludesTurn, true)
    assert.equal(map().executionRun.nodeStates[nodeId].status, 'completed')
    assert.equal(map().executionRun.nodeStates[nodeId].attempts, 1)
  }

  await runNode('prepare')
  assert.equal(map().executionRun.currentNodeId, 'decide')
  await runNode('decide', 'passed')
  assert.equal(map().executionRun.currentNodeId, 'review')
  assert.equal(map().executionRun.status, 'waiting')
  assert.equal(map().executionRun.nodeStates.repair.status, 'pending')
  assert.equal(map().executionRun.nodeStates.review.status, 'waiting')
  assert.throws(() => direct({ type: 'begin-execution-node', nodeId: 'review' }), /checkpoint/i)
  assert.equal(model.requests, 2, 'the checkpoint never enters an Agent turn')

  direct({ type: 'approve-execution-checkpoint', nodeId: 'review' })
  assert.equal(map().executionRun.nodeStates.review.status, 'completed')
  assert.equal(map().executionRun.nodeStates.review.summary, '用户已批准')
  assert.equal(map().executionRun.currentNodeId, 'finish')
  await runNode('finish')
  assert.equal(map().executionRun.status, 'completed')
  assert.equal(map().executionRun.nodeStates.repair.status, 'pending')
  assert.ok(map().executionRun.completedAt)

  const events = agent.session.events
  const calls = events.filter((event) => event.type === 'tool/call')
  const results = events.filter((event) => event.type === 'tool/result')
  assert.deepEqual(calls.map((event) => JSON.parse(event.data.arguments).nodeId), ['prepare', 'decide', 'finish'])
  assert.ok(calls.every((event) => event.data.name === 'brainstorm_execution_complete'))
  assert.equal(results.length, 3)
  assert.ok(results.every((event) => event.data.message.content[0].isError === false))
  assert.equal(events.filter((event) => event.type === 'turn/end').length, 3)
  assert.ok(events.filter((event) => event.type === 'brainstorm/map').length >= 9)
  await handle.dispose()
})
