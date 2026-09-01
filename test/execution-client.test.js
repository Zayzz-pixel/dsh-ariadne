import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'

const NOW = '2026-08-30T00:00:00.000Z'
const t = (key) => key
const noop = () => {}
let definition, client, React, renderToStaticMarkup, previousWindow

before(async () => {
  previousWindow = globalThis.window
  globalThis.window = { innerWidth: 1280, innerHeight: 800, __ModuleLoader__: { load(value) { definition = value } } }
  await import(new URL('../lib/client.js?execution-client-test', import.meta.url))
  assert.ok(definition?.factory)
  const profileRequire = createRequire(path.join(process.env.HOME, '.dsh/profiles/web/package.json'))
  const renderRequire = createRequire(profileRequire.resolve('react-dom/server'))
  React = renderRequire('react')
  renderToStaticMarkup = renderRequire('react-dom/server').renderToStaticMarkup
  client = definition.factory((id) => {
    assert.equal(id, 'react')
    return React
  })
})

after(() => {
  if (previousWindow === undefined) delete globalThis.window
  else globalThis.window = previousWindow
})

function node(id, kind = 'task') {
  return {
    id, kind, title: `${id} 工作包`, instruction: `${id} 完整指令`, sourceNodeIds: ['source-current'],
    requiredInputs: [`${id} 所需输入`], expectedOutputs: [`${id} 可检查产物`], completionCriteria: [`${id} 验收条件`],
  }
}

function linearGraph(count = 3) {
  const nodes = Array.from({ length: count }, (_, index) => node(`step-${index}`))
  return { startNodeId: nodes[0].id, nodes, edges: nodes.slice(1).map((item, index) => ({ id: `edge-${index}`, from: nodes[index].id, to: item.id, condition: 'success' })) }
}

function branchGraph() {
  const nodes = [node('inspect'), node('decide', 'decision'), node('work'), node('unused'), node('gate', 'checkpoint'), node('finish'), node('failure')]
  nodes.find((item) => item.id === 'unused').instruction = 'UNREACHED_WORK_INSTRUCTION'
  return {
    startNodeId: 'inspect', nodes,
    edges: [
      { id: 'e1', from: 'inspect', to: 'decide', condition: 'success' },
      { id: 'e2', from: 'inspect', to: 'failure', condition: 'failure' },
      { id: 'e3', from: 'decide', to: 'work', condition: 'route', routeKey: 'proceed', label: '继续' },
      { id: 'e4', from: 'decide', to: 'unused', condition: 'route', routeKey: 'rework', label: '修正' },
      { id: 'e5', from: 'work', to: 'gate', condition: 'success' },
      { id: 'e6', from: 'unused', to: 'gate', condition: 'success' },
      { id: 'e7', from: 'gate', to: 'finish', condition: 'success' },
    ],
  }
}

function twoLaneGraph(count) {
  const nodes = Array.from({ length: count }, (_, index) => node(`lane-${index}`, index === 0 ? 'decision' : index === count - 1 ? 'checkpoint' : 'task'))
  const edges = [1, 2].map((index) => ({ id: `route-${index}`, from: nodes[0].id, to: nodes[index].id, condition: 'route', routeKey: `lane-${index}` }))
  for (let index = 1; index < count - 1; index += 1) {
    edges.push({ id: `next-${index}`, from: nodes[index].id, to: nodes[Math.min(index + 2, count - 1)].id, condition: 'success' })
  }
  return { startNodeId: nodes[0].id, nodes, edges }
}

function mapFor(graph, executionRun) {
  return {
    version: 2, topic: 'Execution client fixture', projectId: 'project-client', phase: 'executing',
    frame: { goal: '交付可运行版本', organizingPrinciple: '按真实依赖组织' },
    nodes: [
      { id: 'source-current', title: '当前来源', note: 'CURRENT_SOURCE_NOTE', userNote: 'PERSONAL_NOTE_NOT_SHARED', status: 'selected', source: 'user' },
      { id: 'source-other', title: '其他已选来源', note: 'OTHER_SELECTED_NOTE', status: 'selected', source: 'user' },
      { id: 'source-unselected', title: '未选来源', note: 'UNSELECTED_PRIVATE_NOTE', status: 'expanded', source: 'user' },
    ],
    links: [], selectedIds: ['source-current', 'source-other'], layout: { offsets: {}, sizes: {} },
    finalPlan: { version: 2, generatedAt: NOW, graph, uncovered: [{ id: 'gap', title: '其他来源暂缓', reason: '后续处理', sourceNodeIds: ['source-other'] }] },
    ...(executionRun ? { executionRun } : {}), createdAt: NOW, updatedAt: NOW,
  }
}

function runAt(graph, currentNodeId, status = 'ready', previous = {}) {
  return {
    version: 1, id: 'run-client', planGeneratedAt: NOW, currentNodeId,
    status: ['failed', 'blocked'].includes(status) ? 'blocked' : status,
    nodeStates: {
      ...Object.fromEntries(graph.nodes.map((item) => [item.id, { status: 'pending', attempts: 0 }])),
      ...previous, [currentNodeId]: { status, attempts: status === 'running' ? 1 : 0 },
    },
    startedAt: NOW, updatedAt: NOW,
  }
}

function viewProps(map) {
  return { map, session: { sessionId: 'session-execution', prompt: async () => ({ ok: true, value: { accepted: true } }) }, t, onShowMap: noop, onOpenCandidate: noop, onJumpSource: noop }
}

function inspectorProps(map, id = map.finalPlan.graph.startNodeId) {
  return { ...viewProps(map), node: map.finalPlan.graph.nodes.find((item) => item.id === id), busy: false, agentBusy: false, onAction: noop, onExecute: noop }
}

function render(component, props) {
  return renderToStaticMarkup(React.createElement(component, props))
}

function elements(tree, predicate) {
  const found = []
  const visit = (item) => {
    if (Array.isArray(item)) return item.forEach(visit)
    if (!item || typeof item !== 'object') return
    if (predicate(item)) found.push(item)
    visit(item.props?.children)
  }
  visit(tree)
  return found
}

// Only the directly rendered component owns hooks; child components remain inspectable elements.
function interactionClient() {
  const states = [], dependencies = []
  let stateIndex = 0, effectIndex = 0, effects = [], changed = false
  const fakeReact = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) { return { type, props: { ...(props ?? {}), children } } },
    useMemo(factory) { return factory() },
    useRef(value) { return { current: value } },
    useSyncExternalStore(_subscribe, getSnapshot) { return getSnapshot() },
    useState(initial) {
      const index = stateIndex++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], (update) => {
        const value = typeof update === 'function' ? update(states[index]) : update
        changed ||= !Object.is(value, states[index])
        states[index] = value
      }]
    },
    useEffect(effect, values) {
      const index = effectIndex++
      if (!dependencies[index] || values.some((value, offset) => !Object.is(value, dependencies[index][offset]))) effects.push(effect)
      dependencies[index] = values
    },
  }
  return {
    client: definition.factory((id) => { assert.equal(id, 'react'); return fakeReact }),
    render(component, props) {
      for (let pass = 0; pass < 5; pass += 1) {
        stateIndex = 0; effectIndex = 0; changed = false; effects = []
        const tree = component(props)
        effects.forEach((effect) => effect())
        if (!changed) return tree
      }
      throw new Error('fake hooks did not settle')
    },
  }
}

test('execution DAG layout is deterministic, bounded and nonoverlapping at 20 and 30 nodes', () => {
  for (const count of [20, 30]) {
    const graph = twoLaneGraph(count)
    const layout = client.__execution.executionGraphLayout(graph)
    assert.deepEqual(layout, client.__execution.executionGraphLayout(structuredClone(graph)))
    assert.equal(Object.keys(layout.rects).length, count)
    assert.equal(new Set(layout.order).size, count)
    const rects = Object.entries(layout.rects)
    for (const [id, rect] of rects) {
      assert.ok(Object.values(rect).every(Number.isFinite), id)
      assert.ok(rect.x >= 0 && rect.y >= 0 && rect.w > 0 && rect.h > 0, id)
      assert.ok(rect.x + rect.w <= layout.width && rect.y + rect.h <= layout.height, id)
    }
    for (let left = 0; left < rects.length; left += 1) {
      for (let right = left + 1; right < rects.length; right += 1) {
        const [idA, a] = rects[left], [idB, b] = rects[right]
        assert.equal(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y, false, `${idA} overlaps ${idB}`)
      }
    }
    for (const edge of graph.edges) {
      assert.ok(layout.rects[edge.from].x + layout.rects[edge.from].w < layout.rects[edge.to].x)
      assert.ok(layout.order.indexOf(edge.from) < layout.order.indexOf(edge.to))
    }
  }
})

test('Execution View defaults linear plans to List and Decision plans to Graph without dropping nodes or edges', () => {
  const linear = linearGraph()
  assert.equal(client.__execution.isLinearPlanGraph(linear), true)
  const listHtml = render(client.__components.ExecutionView, viewProps(mapFor(linear)))
  assert.match(listHtml, /class="bs-exec-list"/)
  assert.doesNotMatch(listHtml, /class="bs-exec-chart"/)
  assert.equal((listHtml.match(/data-execution-node-id=/g) ?? []).length, linear.nodes.length)

  const graph = twoLaneGraph(30)
  assert.equal(client.__execution.isLinearPlanGraph(graph), false)
  const graphHtml = render(client.__components.ExecutionView, viewProps(mapFor(graph)))
  assert.match(graphHtml, /class="bs-exec-chart"/)
  assert.doesNotMatch(graphHtml, /class="bs-exec-list"/)
  assert.equal((graphHtml.match(/data-execution-node-id=/g) ?? []).length, graph.nodes.length)
  assert.equal((graphHtml.match(/data-execution-edge-id=/g) ?? []).length, graph.edges.length)
  assert.match(graphHtml, /data-kind="decision"/)
  assert.match(graphHtml, /data-kind="checkpoint"/)
})

test('Inspector exposes complete work-package fields and freezes editing once any Run exists', () => {
  const graph = linearGraph()
  const props = inspectorProps(mapFor(graph))
  const html = render(client.__components.ExecutionNodeInspector, props)
  for (const text of [props.node.title, props.node.instruction, ...props.node.requiredInputs, ...props.node.expectedOutputs, ...props.node.completionCriteria, '当前来源', 'execution.edit']) assert.ok(html.includes(text), text)
  for (const status of ['ready', 'running', 'completed', 'cancelled']) {
    const run = runAt(graph, graph.startNodeId)
    run.status = status
    const frozen = render(client.__components.ExecutionNodeInspector, inspectorProps(mapFor(graph, run)))
    assert.match(frozen, /execution\.frozen/)
    assert.doesNotMatch(frozen, /execution\.edit|<textarea|<input/)
  }
})

test('Inspector actions target only the current node, including explicit checkpoint approval and source navigation', () => {
  const graph = branchGraph()
  for (const [id, status, label] of [['work', 'ready', 'execution.runNode'], ['work', 'blocked', 'execution.retry'], ['work', 'running', 'execution.reset'], ['gate', 'waiting', 'execution.approve']]) {
    const harness = interactionClient()
    const calls = []
    const props = { ...inspectorProps(mapFor(graph, runAt(graph, id, status)), id), onAction: (op) => calls.push(op), onExecute: (...args) => calls.push(args), onJumpSource: (sourceId) => calls.push(sourceId) }
    const tree = harness.render(harness.client.__components.ExecutionNodeInspector, props)
    const action = elements(tree, (item) => item.props?.label === label)[0]
    assert.ok(action, label)
    action.props.onClick()
    assert.deepEqual(calls[0], label === 'execution.approve' ? { type: 'approve-execution-checkpoint', nodeId: id } : label === 'execution.reset' ? { type: 'reset-execution-node', nodeId: id, reason: 'User restored an idle interrupted node' } : label === 'execution.retry' ? [id, true] : [id])
    elements(tree, (item) => item.props?.className === 'bs-plan-source')[0].props.onClick()
    assert.equal(calls.at(-1), 'source-current')
    const other = harness.render(harness.client.__components.ExecutionNodeInspector, { ...props, node: graph.nodes.find((item) => item.id === 'finish') })
    assert.equal(elements(other, (item) => ['execution.runNode', 'execution.retry', 'execution.reset', 'execution.approve'].includes(item.props?.label)).length, 0)
    if (status === 'ready' || status === 'blocked') {
      const occupied = harness.render(harness.client.__components.ExecutionNodeInspector, { ...props, agentBusy: true })
      assert.equal(elements(occupied, (item) => item.props?.label === label)[0].props.disabled, true)
    }
  }
})

test('starting a Run closes an already-open Inspector editor with the same plan and node identity', () => {
  const harness = interactionClient()
  const graph = linearGraph()
  const props = inspectorProps(mapFor(graph))
  const component = harness.client.__components.ExecutionNodeInspector
  let tree = harness.render(component, props)
  elements(tree, (item) => item.props?.label === 'execution.edit')[0].props.onClick()
  tree = harness.render(component, props)
  assert.ok(elements(tree, (item) => item.type === 'textarea').length > 0)
  tree = harness.render(component, { ...props, map: mapFor(graph, runAt(graph, graph.startNodeId)) })
  assert.equal(elements(tree, (item) => item.type === 'textarea' || item.type === 'input').length, 0, 'live editor must disappear when the Run freezes its plan')
  assert.equal(elements(tree, (item) => item.props?.label === 'execution.save').length, 0)
})

test('execution prompt scopes current instructions, criteria, source notes, reached results and exact allowed routes', () => {
  const graph = branchGraph()
  const run = runAt(graph, 'decide', 'running', {
    inspect: { status: 'completed', attempts: 1, summary: 'REACHED_RESULT', outputRefs: ['inspection.md'] },
    unused: { status: 'completed', attempts: 1, summary: 'UNREACHED_RESULT', outputRefs: ['unreached.md'] },
  })
  const map = mapFor(graph, run)
  const current = graph.nodes.find((item) => item.id === 'decide')
  const prompt = client.__prompts.executionNodePrompt(map, run, current, { goal: 'PROJECT_GOAL' })
  assert.equal(prompt.length, 1)
  const text = prompt[0].text
  const context = JSON.parse(text.match(/\n\n(\{[\s\S]*\})$/)[1])
  assert.match(text, /^BRAINSTORM_EXECUTION run=run-client node=decide/)
  assert.match(text, /brainstorm_execution_complete/)
  assert.equal(context.projectGoal, 'PROJECT_GOAL')
  assert.deepEqual(context.frame, map.frame)
  assert.equal(context.topic, map.topic)
  assert.deepEqual(context.node.completionCriteria, current.completionCriteria)
  assert.equal(context.node.instruction, current.instruction)
  assert.deepEqual(context.node.requiredInputs, current.requiredInputs)
  assert.deepEqual(context.node.expectedOutputs, current.expectedOutputs)
  assert.deepEqual(context.sources, [{ id: 'source-current', title: '当前来源', note: 'CURRENT_SOURCE_NOTE' }])
  assert.doesNotMatch(text, /PERSONAL_NOTE_NOT_SHARED/)
  assert.deepEqual(context.previousResults, [{ nodeId: 'inspect', summary: 'REACHED_RESULT', outputRefs: ['inspection.md'] }])
  assert.deepEqual(context.allowedRoutes, [{ routeKey: 'proceed', label: '继续' }, { routeKey: 'rework', label: '修正' }])
  for (const excluded of ['UNSELECTED_PRIVATE_NOTE', 'OTHER_SELECTED_NOTE', 'UNREACHED_WORK_INSTRUCTION', 'UNREACHED_RESULT', 'unreached.md', 'finish 完整指令']) assert.equal(text.includes(excluded), false, excluded)
  assert.equal('graph' in context, false)
  assert.throws(() => client.__prompts.executionNodePrompt(map, run, graph.nodes[0]), /current running/)
  assert.throws(() => client.__prompts.executionNodePrompt(map, runAt(graph, 'decide'), current), /current running/)
  const checkpoint = graph.nodes.find((item) => item.id === 'gate')
  assert.throws(() => client.__prompts.executionNodePrompt(map, runAt(graph, 'gate', 'running'), checkpoint), /current running/)
})

test('execution path and remaining ids follow the chosen route and exclude past unchosen branches', () => {
  const graph = branchGraph()
  const run = runAt(graph, 'gate', 'waiting', {
    inspect: { status: 'completed', attempts: 1 },
    decide: { status: 'completed', attempts: 1, routeKey: 'proceed' },
    work: { status: 'completed', attempts: 1 },
  })
  assert.deepEqual(client.__execution.executionDisplayPath(graph, run), ['inspect', 'decide', 'work', 'gate'])
  assert.deepEqual([...client.__execution.executionRemainingIds(graph, run)], ['gate', 'finish'])
  const html = render(client.__components.ExecutionGraphView, { graph, run, selectedId: 'gate', onSelect: noop, t })
  assert.match(html, /data-execution-node-id="gate"[^>]*data-current="true"/)
  assert.match(html, /data-execution-node-id="unused"[^>]*data-status="unvisited"/)
  assert.match(html, /data-execution-edge-id="e3"[^>]*data-active="true"/)
  assert.match(html, /data-execution-edge-id="e4"[^>]*data-active="false"/)
})

test('personal note editor saves only on command and shares only by explicit action', async (context) => {
  const harness = interactionClient()
  const requests = [], prompts = []
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/brainstorm-op')
    const body = JSON.parse(options.body)
    requests.push(body)
    return { status: 200, json: async () => ({ ok: true }) }
  })
  const map = {
    version: 2, topic: 'Personal note fixture', phase: 'exploring',
    frame: { goal: '推进当前分支', organizingPrinciple: '按问题组织' },
    nodes: [{ id: 'note-node', title: '当前节点', note: '共享摘要', userNote: '原笔记', status: 'expanded', source: 'user', updatedAt: NOW }],
    links: [], selectedIds: [], layout: { offsets: {}, sizes: {} }, createdAt: NOW, updatedAt: NOW,
  }
  const session = {
    sessionId: 'session-personal-note',
    async prompt(prompt, mode) { prompts.push({ prompt, mode }); return { ok: true, value: { accepted: true } } },
  }
  const props = { map, node: map.nodes[0], facts: client.__layout.treeFacts(map), session, t, onSelect: noop, onFocus: noop }
  let tree = harness.render(harness.client.__components.NodeDetail, props)
  const field = elements(tree, (item) => item.props?.className === 'bs-personal-note-field')[0]
  field.props.onChange({ target: { value: '这是一则只由用户写入的笔记' } })
  assert.equal(requests.length, 0, 'typing alone appends no whole-map event')

  tree = harness.render(harness.client.__components.NodeDetail, props)
  const save = elements(tree, (item) => item.props?.label === 'dock.save')[0]
  assert.equal(save.props.disabled, false)
  await save.props.onClick()
  assert.deepEqual(requests.at(-1), { sessionId: session.sessionId, ops: { type: 'set-user-note', nodeId: 'note-node', userNote: '这是一则只由用户写入的笔记' } })
  assert.equal(prompts.length, 0)

  const bring = elements(tree, (item) => item.props?.label === 'dock.bringToTurn')[0]
  await bring.props.onClick()
  assert.equal(prompts.length, 1)
  assert.equal(prompts[0].mode, 'queue')
  assert.match(prompts[0].prompt[0].text, /BRAINSTORM_PERSONAL_NOTE node=note-node/)
  assert.match(prompts[0].prompt[0].text, /这是一则只由用户写入的笔记/)
})

test('prompt queue rejection restores the current node and surfaces the error; accepted prompts keep it running', async (context) => {
  for (const accepted of [false, true]) {
    await context.test(accepted ? 'accepted prompt' : 'RPC queue rejection', async (subtest) => {
      const harness = interactionClient()
      const graph = linearGraph()
      const map = mapFor(graph, runAt(graph, graph.startNodeId))
      const begun = mapFor(structuredClone(graph), runAt(graph, graph.startNodeId, 'running'))
      begun.finalPlan.graph.nodes[0].instruction = 'SERVER_CONFIRMED_CURRENT_INSTRUCTION'
      const requests = [], prompts = []
      subtest.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(url, '/brainstorm-op')
        assert.equal(options.method, 'POST')
        const body = JSON.parse(options.body)
        requests.push(body)
        return { status: 200, json: async () => ({ ok: true, map: body.ops.type === 'begin-execution-node' ? begun : map }) }
      })
      const props = viewProps(map)
      props.session.prompt = async (prompt, mode) => {
        prompts.push({ prompt, mode })
        return accepted ? { ok: true, value: { accepted: true } } : { ok: false, error: { message: 'QUEUE_REJECTED' } }
      }
      let tree = harness.render(harness.client.__components.ExecutionView, props)
      const inspector = elements(tree, (item) => item.type === harness.client.__components.ExecutionNodeInspector)[0]
      await inspector.props.onExecute(graph.startNodeId)
      assert.deepEqual(requests.map((item) => item.ops.type), accepted ? ['begin-execution-node'] : ['begin-execution-node', 'reset-execution-node'])
      assert.ok(requests.every((item) => item.sessionId === 'session-execution' && item.ops.nodeId === graph.startNodeId))
      assert.equal(prompts.length, 1)
      assert.equal(prompts[0].mode, 'queue')
      assert.ok(prompts[0].prompt[0].text.includes('SERVER_CONFIRMED_CURRENT_INSTRUCTION'))
      tree = harness.render(harness.client.__components.ExecutionView, props)
      const errors = elements(tree, (item) => item.props?.role === 'alert')
      assert.equal(errors.length, accepted ? 0 : 1)
      if (!accepted) {
        assert.equal(requests[1].ops.reason, 'QUEUE_REJECTED')
        assert.ok(errors[0].props.children.includes('QUEUE_REJECTED'))
      }
    })
  }
})
