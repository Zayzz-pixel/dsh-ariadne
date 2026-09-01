import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

function elements(tree, predicate) {
  const result = []
  const visit = (item) => {
    if (Array.isArray(item)) return item.forEach(visit)
    if (!item || typeof item !== 'object') return
    if (predicate(item)) result.push(item)
    visit(item.props?.children)
  }
  visit(tree)
  return result
}

async function canvasHarness() {
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  const routeDeclaration = /function routeOrthogonal\([^)]*\)\s*\{/u
  assert.ok(routeDeclaration.test(source))
  let definition, routeCalls = 0, cursor = 0, viewSetter
  const slots = [], updates = []
  // Count actual routing calls in this isolated copy; production exports stay unchanged.
  runInNewContext(source.replace(routeDeclaration, '$&\n__recordCanvasRoute();'), {
    window: { __ModuleLoader__: { load(value) { definition = value } } },
    __recordCanvasRoute() { routeCalls += 1 },
  })
  const fakeReact = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) { return { type, props: { ...(props ?? {}), children } } },
    useEffect() {},
    useSyncExternalStore(_subscribe, snapshot) { return snapshot() },
    useMemo(factory, dependencies) {
      const index = cursor++
      if (!slots[index] || dependencies.some((value, offset) => !Object.is(value, slots[index].dependencies[offset]))) {
        slots[index] = { dependencies, value: factory() }
      }
      return slots[index].value
    },
    useRef(value) {
      const index = cursor++
      slots[index] ??= { current: value }
      return slots[index]
    },
    useState(initial) {
      const index = cursor++
      slots[index] ??= { value: typeof initial === 'function' ? initial() : initial }
      const setter = (update) => updates.push(() => { slots[index].value = typeof update === 'function' ? update(slots[index].value) : update })
      if (slots[index].value?.scale !== undefined) viewSetter = setter
      return [slots[index].value, setter]
    },
  }
  const client = definition.factory((id) => { assert.equal(id, 'react'); return fakeReact })
  return {
    client,
    get routeCalls() { return routeCalls },
    setScale(scale) { viewSetter((view) => ({ ...view, scale })) },
    render(props) {
      updates.splice(0).forEach((update) => update())
      cursor = 0
      return client.__components.MapCanvas(props)
    },
  }
}

function fixture() {
  const nodes = ['root-a', 'child-a1', 'child-a2', 'root-b', 'child-b1'].map((id) => ({ id, title: id, status: 'expanded', source: 'user' }))
  const map = {
    version: 2, topic: 'Canvas performance', phase: 'exploring', nodes,
    links: ['child-a1', 'child-a2', 'child-b1'].map((id) => ({ from: id.startsWith('child-a') ? 'root-a' : 'root-b', to: id, kind: 'parent' })),
    selectedIds: [], layout: { offsets: {}, sizes: {} },
  }
  const noop = () => {}
  return {
    map, phase: 'exploring', t: (key) => key, session: { sessionId: 'canvas-performance' }, offsets: {}, sizes: {},
    onOffsetChange: noop, onSizeChange: noop, fitNonce: 0, activeNodeId: null, onActiveNodeChange: noop,
    focusId: null, onFocusIdChange: noop, collapsedIds: [], onToggleCollapse: noop,
    minimapOpen: true, onToggleMinimap: noop, dockOpen: false, dockWidth: 0,
  }
}

const stage = (tree) => elements(tree, (item) => item.props?.className?.startsWith('bs-stage'))[0]
const edges = (tree) => elements(tree, (item) => item.type === 'path' && item.props?.['data-edge-key'])
const rects = (tree) => elements(tree, (item) => item.props?.rectById)[0].props.rectById
const card = (tree, id) => elements(tree, (item) => item.props?.node?.id === id)[0]

test('MapCanvas reuses world-space geometry for pan, zoom and active-path changes', async () => {
  const harness = await canvasHarness()
  const props = fixture()
  let tree = harness.render(props)
  const initialRoutes = harness.routeCalls
  const initialRects = rects(tree)
  const initialPaths = edges(tree).map((edge) => [edge.props['data-edge-key'], edge.props.d])
  const initialTransform = stage(tree).props.style.transform
  assert.equal(initialRoutes, props.map.nodes.length)
  assert.equal(stage(tree).props.onPointerDown, undefined, 'the moving stage never owns pan handlers')
  tree.props.onPointerDown({ button: 0, clientX: 100, clientY: 100, target: { closest: () => null }, currentTarget: { setPointerCapture() {} }, pointerId: 1 })
  tree.props.onPointerMove({ clientX: 180, clientY: 140 })
  tree.props.onPointerUp()
  assert.doesNotThrow(() => { tree = harness.render(props) }, 'queued pan update survives pointerup clearing dragRef')
  assert.notEqual(stage(tree).props.style.transform, initialTransform)
  assert.equal(harness.routeCalls, initialRoutes)
  assert.equal(rects(tree), initialRects)
  assert.deepEqual(edges(tree).map((edge) => [edge.props['data-edge-key'], edge.props.d]), initialPaths)

  harness.setScale(1.4)
  tree = harness.render(props)
  assert.match(stage(tree).props.style.transform, /scale\(1\.4\)/)
  assert.equal(card(tree, 'child-a1').props.viewScale, 1.4, 'node drag coordinates still receive the current scale')
  assert.equal(harness.routeCalls, initialRoutes)
  assert.equal(rects(tree), initialRects)

  tree = harness.render({ ...props, activeNodeId: 'child-a1', focusId: 'root-a' })
  assert.equal(harness.routeCalls, initialRoutes, 'highlight and subtree dimming do not reroute unchanged edges')
  assert.match(edges(tree).find((edge) => edge.props['data-edge-key'] === 'root-a->child-a1').props.className, /bs-path/)
  assert.match(edges(tree).find((edge) => edge.props['data-edge-key'] === 'root-b->child-b1').props.className, /bs-dim/)
  const constrained = harness.client.__layout.constrainCanvasView({ scale: 1, tx: 5000, ty: -5000 }, { x: 150, y: 150, w: 1000, h: 700 }, { usableW: 900, h: 600 })
  assert.equal(constrained.tx, 678)
  assert.equal(constrained.ty, -778)
})

test('MapCanvas invalidates route geometry on node drag, resize, collapse and Map changes', async () => {
  const harness = await canvasHarness()
  let props = fixture()
  props.onOffsetChange = (update) => { props = { ...props, offsets: update(props.offsets) } }
  props.onSizeChange = (update) => { props = { ...props, sizes: update(props.sizes) } }
  let tree = harness.render(props)
  const beforeDrag = rects(tree).get('child-a1')
  const beforePath = edges(tree).find((edge) => edge.props['data-edge-key'] === 'root-a->child-a1').props.d
  let calls = harness.routeCalls
  card(tree, 'child-a1').props.onDrag(props.map.nodes[1], 120, 60)
  tree = harness.render(props)
  assert.equal(harness.routeCalls - calls, edges(tree).length)
  assert.equal(rects(tree).get('child-a1').x, beforeDrag.x + 120)
  assert.equal(rects(tree).get('child-a1').y, beforeDrag.y + 60)
  assert.notEqual(edges(tree).find((edge) => edge.props['data-edge-key'] === 'root-a->child-a1').props.d, beforePath)

  calls = harness.routeCalls
  card(tree, 'child-a1').props.onResize(props.map.nodes[1], 330, 180)
  tree = harness.render(props)
  assert.equal(harness.routeCalls - calls, edges(tree).length)
  assert.equal(rects(tree).get('child-a1').w, 330)
  assert.equal(rects(tree).get('child-a1').h, 180)

  calls = harness.routeCalls
  props = { ...props, collapsedIds: ['root-a'] }
  tree = harness.render(props)
  assert.equal(harness.routeCalls - calls, 3)
  assert.equal(rects(tree).has('child-a1'), false)
  assert.equal(edges(tree).length, 3)

  calls = harness.routeCalls
  props = { ...props, collapsedIds: [], map: { ...props.map, nodes: [...props.map.nodes, { id: 'child-b2', title: 'New child', status: 'expanded', source: 'agent' }], links: [...props.map.links, { from: 'root-b', to: 'child-b2', kind: 'parent' }] } }
  tree = harness.render(props)
  assert.equal(harness.routeCalls - calls, 6)
  assert.equal(rects(tree).has('child-a1'), true)
  assert.equal(rects(tree).has('child-b2'), true)
  assert.ok(edges(tree).some((edge) => edge.props['data-edge-key'] === 'root-b->child-b2'))
})
