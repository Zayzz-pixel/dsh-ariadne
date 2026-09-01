import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
import { normalizeMap, treeFacts, applyFinalPlan } from '../lib/map-state.js'
import { mapToJsonCanvas, toExecutionJson, toExecutionMarkdown } from '../lib/export.js'
import { buildProjectOverview, createProject } from '../lib/project-state.js'

let clientDefinition
globalThis.window = {
  innerWidth: 1728,
  innerHeight: 1117,
  __ModuleLoader__: { load(definition) { clientDefinition = definition } },
}
await import(pathToFileURL(path.join(process.cwd(), 'lib/client.js')))
const profileRequire = createRequire(path.join(process.env.HOME, '.dsh/profiles/web/package.json'))
const renderRequire = createRequire(profileRequire.resolve('react-dom/server'))
const React = renderRequire('react')
const { renderToStaticMarkup } = renderRequire('react-dom/server')
const client = clientDefinition.factory((id) => {
  if (id === 'react') return React
  throw new Error(`unexpected client dependency ${id}`)
})

function sampleMap(count) {
  const nodes = []
  const links = []
  const roots = Math.min(9, count)
  for (let index = 0; index < count; index += 1) {
    const id = `node-${index}`
    nodes.push({
      id,
      title: index < roots ? `Root direction ${index + 1}` : `Decision detail ${index + 1}`,
      note: `Benchmark note for node ${index + 1}`,
      status: index % 17 === 0 ? 'unexplored' : index % 19 === 0 ? 'parked' : 'expanded',
      source: index % 3 === 0 ? 'user' : 'agent',
      createdAt: '2026-08-23T00:00:00.000Z',
      updatedAt: '2026-08-23T00:00:00.000Z',
    })
    if (index >= roots) links.push({ from: `node-${Math.floor((index - roots) / 4) % roots}`, to: id, kind: 'parent' })
  }
  return {
    version: 2,
    projectId: 'benchmark-project',
    topic: `${count} node benchmark`,
    phase: 'exploring',
    nodes,
    links,
    selectedIds: nodes.filter((_, index) => index % 23 === 0).map((node) => node.id),
    layout: { offsets: {}, sizes: {} },
    createdAt: '2026-08-23T00:00:00.000Z',
    updatedAt: '2026-08-23T00:00:00.000Z',
  }
}

function timing(fn, iterations = 25) {
  for (let index = 0; index < 3; index += 1) fn()
  const samples = []
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  const median = samples[Math.floor(samples.length / 2)]
  const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))]
  return { medianMs: Number(median.toFixed(3)), p95Ms: Number(p95.toFixed(3)) }
}

const rows = []
for (const count of [31, 100, 200]) {
  const raw = sampleMap(count)
  const map = normalizeMap(raw)
  const facts = treeFacts(map)
  const sizeOf = (node) => client.__layout.measureNode(node, facts.roots.some((root) => root.id === node.id))
  const renderMap = () => renderToStaticMarkup(React.createElement(client.__components.MapCanvas, {
    map,
    phase: 'exploring',
    t: (key) => key,
    session: { prompt: async () => {} },
    offsets: {},
    onOffsetChange: () => {},
    sizes: {},
    onSizeChange: () => {},
    fitNonce: 0,
    activeNodeId: null,
    onActiveNodeChange: () => {},
    focusId: null,
    onFocusIdChange: () => {},
    collapsedIds: [],
    onToggleCollapse: () => {},
    dockOpen: false,
    dockWidth: 0,
  }))
  rows.push({
    nodes: count,
    normalize: timing(() => normalizeMap(raw)),
    treeFacts: timing(() => treeFacts(map)),
    layout: timing(() => client.__layout.balancedTreeLayout(map, sizeOf)),
    canvas: timing(() => mapToJsonCanvas(map, client.__layout.canvasRectsForMap(map))),
    search: timing(() => map.nodes.filter((node) => `${node.title}\n${node.note}`.toLocaleLowerCase().includes('node'))),
    render: timing(renderMap, count === 200 ? 7 : 12),
  })
}

const project = createProject({ id: 'benchmark-project', title: '50 Session benchmark', cwd: '/benchmark' })
const map31 = sampleMap(31)
const projectEntries = Array.from({ length: 50 }, (_, index) => ({ sessionId: `session-${index}`, title: `Session ${index}`, map: map31 }))
const project50 = timing(() => buildProjectOverview(project, projectEntries), 15)

const executionGraphs = []
for (const count of [20, 30]) {
  const nodes = Array.from({ length: count }, (_, index) => ({
    id: `step-${index}`, kind: index === 1 ? 'decision' : index === count - 1 ? 'checkpoint' : 'task',
    title: `Execution step ${index + 1}`, instruction: `Check synthetic output ${index + 1}.`,
    sourceNodeIds: ['node-0'], completionCriteria: [`Output ${index + 1} is checkable`],
  }))
  const split = Math.ceil(count / 2)
  const edges = [
    { id: 'prepare', from: 'step-0', to: 'step-1', condition: 'success' },
    { id: 'pass', from: 'step-1', to: 'step-2', condition: 'route', routeKey: 'pass' },
    { id: 'repair', from: 'step-1', to: `step-${split}`, condition: 'route', routeKey: 'repair' },
  ]
  for (const [start, end] of [[2, split - 1], [split, count - 2]]) {
    for (let index = start; index <= end; index++) edges.push({
      id: `edge-${index}`, from: `step-${index}`,
      to: `step-${index === end ? count - 1 : index + 1}`, condition: 'success',
    })
  }
  const map = applyFinalPlan(normalizeMap(sampleMap(1)), { graph: { startNodeId: 'step-0', nodes, edges }, uncovered: [] })
  executionGraphs.push({
    nodes: count, edges: edges.length,
    normalize: timing(() => normalizeMap(map)),
    layout: timing(() => client.__execution.executionGraphLayout(map.finalPlan.graph)),
    exportJson: timing(() => toExecutionJson(map)),
    exportMarkdown: timing(() => toExecutionMarkdown(map)),
    render: timing(() => renderToStaticMarkup(React.createElement(client.__components.ExecutionView, {
      map, session: { sessionId: 'execution-benchmark' }, t: (key) => key,
      onShowMap: () => {}, onJumpSource: () => {},
    })), 12),
  })
}

console.log(JSON.stringify({ dsh: '0.1.1-rc.2', rows, project50, executionGraphs }, null, 2))
