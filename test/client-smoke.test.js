import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { normalizeMap } from '../lib/map-state.js'

test('client bundle: ModuleLoader registration + apply against a fake client ctx', async () => {
  const clientUrl = pathToFileURL(path.join(process.cwd(), 'lib/client.js'))
  let definition
  globalThis.window = {
    innerWidth: 1200,
    innerHeight: 800,
    __ModuleLoader__: {
      load(def) {
        definition = def
      },
    },
  }
  try {
    await import(clientUrl)
    assert.ok(definition, 'window.__ModuleLoader__.load must be called at bundle load')

    const profileRequire = createRequire(path.join(process.env.HOME, '.dsh/profiles/web/package.json'))
    const renderRequire = createRequire(profileRequire.resolve('react-dom/server'))
    const React = renderRequire('react')
    const require = (id) => {
      if (id === 'react') return React
      throw new Error(`unexpected require in client factory: ${id}`)
    }

    const exports = definition.factory(require)
    assert.equal(typeof exports.apply, 'function')

    const pendingStateUpdates = []
    const fakeReact = {
      Fragment: Symbol('Fragment'),
      createElement(type, props, ...children) {
        return { type, props: { ...(props ?? {}), children } }
      },
      useEffect() {},
      useMemo(factory) {
        return factory()
      },
      useRef(value) {
        return { current: value }
      },
      useState(value) {
        const current = typeof value === 'function' ? value() : value
        return [current, (next) => pendingStateUpdates.push(() => typeof next === 'function' ? next(current) : next)]
      },
      useSyncExternalStore(_subscribe, getSnapshot) {
        return getSnapshot()
      },
    }
    const interactionExports = definition.factory((id) => {
      if (id === 'react') return fakeReact
      throw new Error(`unexpected require in interaction factory: ${id}`)
    })

    const workbenchStore = exports.__stores.workbenchStore
    const workbenchSession = { sessionId: 'session-workbench' }
    workbenchStore.setContext(workbenchSession, {
      version: 2,
      topic: 'Workbench',
      phase: 'exploring',
      nodes: [{ id: 'root', title: 'Root', status: 'expanded', source: 'user' }],
      links: [],
      selectedIds: [],
      layout: { offsets: {}, sizes: {} },
    })
    assert.equal(workbenchStore.get('session-workbench').open, true, 'Focus Dock defaults open')
    assert.equal(workbenchStore.get('session-workbench').activeNodeId, null, 'invalid Active Node falls back to the Session Topic')
    workbenchStore.close('session-workbench')
    workbenchStore.activate('session-workbench', 'root')
    assert.equal(workbenchStore.get('session-workbench').open, false, 'selecting a map node keeps a closed Focus Dock closed')
    assert.equal(workbenchStore.get('session-workbench').activeNodeId, 'root', 'selection still updates Active Node while the Focus Dock is closed')
    workbenchStore.resize('session-workbench', 900)
    assert.equal(workbenchStore.get('session-workbench').width, 680, 'Focus Dock width follows the blueprint bounds')
    workbenchStore.focus('session-workbench', 'root')
    assert.equal(workbenchStore.get('session-workbench').focusId, 'root', 'map subtree focus shares the workbench store')
    assert.equal(workbenchStore.get('session-workbench').open, true, 'explicit branch focus opens the Focus Dock')
    assert.equal(workbenchStore.get('session-workbench').treeOpen, false, 'structure tree defaults closed')
    workbenchStore.toggleTreePanel('session-workbench')
    assert.equal(workbenchStore.get('session-workbench').treeOpen, true, 'structure tree can be opened explicitly')
    workbenchStore.setCompact('session-workbench', true)
    assert.equal(workbenchStore.get('session-workbench').compact, true, 'Focus Dock supports the compact rail')
    workbenchStore.open('session-workbench')
    assert.equal(workbenchStore.get('session-workbench').compact, false, 'opening Focus Dock restores the full panel')
    workbenchStore.toggleMinimap('session-workbench')
    assert.equal(workbenchStore.get('session-workbench').minimapOpen, false, 'Minimap collapse stays in local workbench state')

    const v2Map = {
      version: 2,
      topic: 'T',
      phase: 'exploring',
      nodes: [
        { id: 'a', title: 'A', status: 'expanded', source: 'user' },
        { id: 'b', title: 'B', status: 'expanded', source: 'agent' },
      ],
      links: [{ from: 'a', to: 'b', kind: 'parent' }],
      selectedIds: ['a', 'b'],
      layout: { offsets: {}, sizes: {} },
    }
    const canvasTree = interactionExports.__components.MapCanvas({
      map: v2Map,
      phase: 'exploring',
      t: (key) => key,
      session: { sessionId: 'canvas-session' },
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
      minimapOpen: true,
      onToggleMinimap: () => {},
      dockOpen: false,
      dockWidth: 0,
    })
    const stageTree = canvasTree.props.children.find((child) => child?.props?.className?.includes('bs-stage'))
    assert.equal(canvasTree.props.className, 'bs-root')
    assert.equal(typeof canvasTree.props.onPointerDown, 'function', 'the fixed viewport owns canvas panning')
    assert.equal(stageTree.props.onPointerDown, undefined, 'the moving stage cannot strand its own pan handlers off-screen')
    canvasTree.props.onPointerDown({ button: 0, clientX: 100, clientY: 100, pointerId: 1, target: { closest: () => null }, currentTarget: { setPointerCapture() {} } })
    canvasTree.props.onPointerMove({ clientX: 180, clientY: 140 })
    canvasTree.props.onPointerUp()
    assert.doesNotThrow(() => pendingStateUpdates.shift()(), 'a deferred pan update survives pointerup clearing the live drag ref')

    const constrainedView = exports.__layout.constrainCanvasView(
      { scale: 1, tx: 5000, ty: -5000 },
      { x: 150, y: 150, w: 1000, h: 700 },
      { usableW: 900, h: 600 },
    )
    assert.deepEqual(constrainedView, { scale: 1, tx: 678, ty: -778 }, 'canvas panning keeps a recoverable strip of content visible')
    const sparseView = exports.__layout.constrainCanvasView(
      { scale: 1, tx: 0, ty: 0 },
      [{ x: 150, y: 900, w: 200, h: 80 }, { x: 1800, y: 150, w: 200, h: 80 }],
      { usableW: 900, h: 600 },
    )
    assert.deepEqual(sparseView, { scale: 1, tx: 0, ty: -340 }, 'independent axis overlap cannot leave every real node off-screen')
    assert.deepEqual(exports.__layout.nodeMenuPosition(850, 550, 900, 560), { x: 696, y: 356 }, 'node menu stays inside the canvas bottom-right edge')
    assert.deepEqual(exports.__layout.nodeMenuPosition(-20, -5, 900, 560), { x: 8, y: 8 }, 'node menu keeps a viewport gutter at the top-left edge')
    assert.deepEqual(exports.__layout.nodeMenuPosition(600, 200, 420, 560), { x: 216, y: 200 }, 'node menu respects the usable width beside an overlay Focus Dock')
    const facts = exports.__layout.treeFacts(v2Map)
    assert.equal(facts.depthById.get('a'), 1)
    assert.equal(facts.depthById.get('b'), 2)
    const executing = {
      ...v2Map,
      phase: 'executing',
      finalPlan: {
        items: [
          { sourceNodeIds: ['b'] },
          { sourceNodeIds: ['a'] },
        ],
      },
    }
    const chain = exports.__layout.chainLayout(executing, () => ({ w: 160, h: 70 })).chain
    assert.deepEqual(chain, ['b', 'a'], 'execution chain follows explicit Final Plan order')

    const sampleNodes = []
    const sampleLinks = []
    const childCounts = [3, 2, 4, 1, 3, 2, 3, 2, 2]
    childCounts.forEach((count, rootIndex) => {
      const rootId = `root-${rootIndex}`
      sampleNodes.push({ id: rootId, title: `Root direction ${rootIndex}`, note: `Root ${rootIndex} summary`, status: 'expanded', source: 'user' })
      for (let childIndex = 0; childIndex < count; childIndex += 1) {
        const childId = `${rootId}-child-${childIndex}`
        sampleNodes.push({ id: childId, title: `Decision detail ${rootIndex}.${childIndex}`, note: `Concrete implementation note ${childIndex}`, ...(rootIndex === 0 && childIndex === 0 ? { userNote: 'PERSONAL_THOUGHT' } : {}), status: 'expanded', source: 'agent' })
        sampleLinks.push({ from: rootId, to: childId, kind: 'parent' })
      }
    })
    const sampleMap = {
      version: 2,
      topic: '31 node layout sample',
      frame: { goal: '形成可执行的研究方向', organizingPrinciple: '按问题、证据与约束组织' },
      phase: 'exploring',
      nodes: sampleNodes,
      links: sampleLinks,
      selectedIds: [],
      layout: { offsets: {}, sizes: {} },
    }
    const sampleFacts = exports.__layout.treeFacts(sampleMap)
    const sizeOf = (node) => exports.__layout.measureNode(node, sampleFacts.roots.some((root) => root.id === node.id))
    const firstLayout = exports.__layout.balancedTreeLayout(sampleMap, sizeOf)
    const secondLayout = exports.__layout.balancedTreeLayout(sampleMap, sizeOf)
    assert.deepEqual([...firstLayout.positions], [...secondLayout.positions], 'same map produces deterministic base positions')
    assert.equal(firstLayout.positions.size, 32, 'topic and all 31 nodes are positioned')
		const exportRects = exports.__layout.canvasRectsForMap(sampleMap, { 'root-0': { dx: 24, dy: 12 } }, { 'root-0': { w: 260, h: 110 } })
		assert.equal(Object.keys(exportRects).length, 31, 'Canvas export receives one final Rect per map node')
		assert.equal(exportRects['root-0'].w, 260)
		assert.equal(exportRects['root-0'].h, 110)

    const sampleRects = new Map()
    for (const [id, position] of firstLayout.positions) {
      if (id === '__topic__') {
        const { w, h } = exports.__layout.TOPIC_SIZE
        sampleRects.set(id, { x: position.x - w / 2, y: position.y - h / 2, w, h })
      } else {
        const node = sampleFacts.byId.get(id)
        sampleRects.set(id, exports.__layout.rectOf(node, position, sizeOf(node)))
      }
    }
    const nodeRects = [...sampleRects.entries()].filter(([id]) => id !== '__topic__')
    for (let left = 0; left < nodeRects.length; left += 1) {
      for (let right = left + 1; right < nodeRects.length; right += 1) {
        assert.equal(exports.__layout.rectsOverlap(nodeRects[left][1], nodeRects[right][1]), false, `nodes ${nodeRects[left][0]} and ${nodeRects[right][0]} do not overlap`)
      }
    }
    for (const group of firstLayout.groups) {
      for (const id of group.ids) {
        const rect = sampleRects.get(id)
        assert.ok(rect.x >= group.bounds.x && rect.y >= group.bounds.y && rect.x + rect.w <= group.bounds.x + group.bounds.w && rect.y + rect.h <= group.bounds.y + group.bounds.h, `group ${group.root.id} contains ${id}`)
      }
    }

    const collapsed = exports.__layout.balancedTreeLayout(sampleMap, sizeOf, new Set(['root-0']))
    assert.ok(collapsed.positions.has('root-0'), 'collapsed root remains visible')
    assert.equal(collapsed.positions.has('root-0-child-0'), false, 'collapsed descendants leave visible layout')
    workbenchStore.setContext(workbenchSession, sampleMap)
    workbenchStore.toggleTree(workbenchSession.sessionId, 'root-1')
    assert.deepEqual(workbenchStore.get(workbenchSession.sessionId).treeExpandedIds, ['root-1'], 'manual Focus Tree expansion stays in workbench state')
    workbenchStore.toggleCollapse(workbenchSession.sessionId, 'root-0')
    assert.deepEqual(workbenchStore.get(workbenchSession.sessionId).collapsedIds, ['root-0'], 'collapse is local workbench state')
    workbenchStore.activate(workbenchSession.sessionId, 'root-0-child-0')
    assert.deepEqual(workbenchStore.get(workbenchSession.sessionId).collapsedIds, [], 'activating a hidden descendant expands its ancestor path')
    const activePath = exports.__layout.activePathFacts(sampleMap, 'root-2-child-1')
    assert.deepEqual([...activePath.nodeIds], ['root-2', 'root-2-child-1'])
    assert.ok(activePath.edgeKeys.has('__topic__->root-2'))
    assert.ok(activePath.edgeKeys.has('root-2->root-2-child-1'))

    const { renderToStaticMarkup } = renderRequire('react-dom/server')
    const dockState = {
      open: true,
      compact: false,
      treeOpen: false,
      width: 520,
      activeNodeId: 'root-0-child-0',
      focusId: null,
      collapsedIds: [],
      treeExpandedIds: [],
      map: sampleMap,
      session: { prompt: async () => ({ ok: true, value: { accepted: true } }) },
    }
    const dockHtml = renderToStaticMarkup(React.createElement(exports.__components.FocusDock, {
      sessionId: 'render-session',
      state: dockState,
      t: (key) => key,
    }))
    assert.match(dockHtml, /dock\.structure/, 'Focus Dock exposes its optional structure tree')
    assert.doesNotMatch(dockHtml, /dock\.searchPlaceholder/, 'structure tree stays closed by default')
    assert.match(dockHtml, /dock\.editTitle/, 'node title has a direct edit control')
    assert.match(dockHtml, /dock\.editNote/, 'node note has a direct edit control')
    assert.match(dockHtml, /dock\.personalNote/, 'personal notes are the primary work area')
    assert.match(dockHtml, /PERSONAL_THOUGHT/)
    assert.match(dockHtml, /dock\.bringToTurn/)
    assert.match(dockHtml, /dock\.workSummary/)
    assert.match(dockHtml, /dock\.currentUnderstanding/, 'node work card renders current understanding')
    assert.match(dockHtml, /dock\.unresolved/, 'node work card renders unresolved questions')
    assert.match(dockHtml, /dock\.nextStep/, 'node work card renders the next step')
    assert.match(dockHtml, /dock\.structure/, 'node detail keeps structure context compact')
    assert.match(dockHtml, /dock\.createChild/, 'node detail renders the manual child entry')
    assert.equal((dockHtml.match(/bs-tree-item/g) ?? []).length, 0, 'closed structure tree does not consume Dock width')
    const treeDockHtml = renderToStaticMarkup(React.createElement(exports.__components.FocusDock, { sessionId: 'render-tree-session', state: { ...dockState, treeOpen: true }, t: (key) => key }))
    assert.match(treeDockHtml, /dock\.searchPlaceholder/, 'opened structure tree renders node search')
    assert.equal((treeDockHtml.match(/bs-tree-item/g) ?? []).length, 12, 'opened structure tree keeps active path expansion')
    const compactHtml = renderToStaticMarkup(React.createElement(exports.__components.FocusDock, {
      sessionId: 'render-session',
      state: { open: true, compact: true, width: 520, map: sampleMap },
      t: (key) => key,
    }))
    assert.match(compactHtml, /bs-focus-dock bs-compact/, 'Focus Dock renders its compact rail')

    assert.deepEqual(exports.__notes.parseNodeNote('普通旧记录'), {
      understanding: '普通旧记录',
      unresolved: '',
      nextStep: '',
      rawFallback: '普通旧记录',
    })
    const structuredNote = '## 当前理解\n\n已经确认 A\n\n## 待解决\n\n仍需验证 B\n\n## 下一步\n\n执行 C'
    assert.deepEqual(exports.__notes.parseNodeNote(structuredNote), { understanding: '已经确认 A', unresolved: '仍需验证 B', nextStep: '执行 C' })
    assert.equal(exports.__notes.parseNodeNote('## 当前理解：\n相似但非精确标题').understanding, '## 当前理解：\n相似但非精确标题')
    const serialized = exports.__notes.serializeNodeNote({ understanding: 'U', unresolved: '', nextStep: 'N' })
    assert.deepEqual(exports.__notes.parseNodeNote(serialized), { understanding: 'U', unresolved: '', nextStep: 'N' }, 'structured note serialize/parse is reversible')

    const frameHtml = renderToStaticMarkup(React.createElement(exports.__components.FrameBar, {
      map: sampleMap,
      session: { sessionId: 'frame-session' },
      t: (key) => key,
    }))
    assert.match(frameHtml, /形成可执行的研究方向/)
    assert.match(frameHtml, /按问题、证据与约束组织/)
    const emptyFrameHtml = renderToStaticMarkup(React.createElement(exports.__components.FrameBar, { map: v2Map, session: { sessionId: 'frame-session' }, t: (key) => key }))
    assert.match(emptyFrameHtml, /frame\.empty/)

    const emptyHtml = renderToStaticMarkup(React.createElement(exports.__components.EmptyMapView, {
      session: { prompt: async () => ({ ok: true, value: { accepted: true } }) },
      t: (key) => key,
    }))
    assert.match(emptyHtml, /backfill\.action/, 'empty map offers initial conversation backfill')
    assert.match(emptyHtml, /backfill\.current/, 'empty map also offers a fresh current-topic start')
    const backfillText = exports.__prompts.backfillPrompt()[0].text
    assert.match(backfillText, /只提取真实出现/)
    assert.match(backfillText, /不要补充对话中没有出现的新创意/)
    assert.match(backfillText, /不要生成执行计划/)
    const createText = exports.__prompts.createPrompt()[0].text
    assert.match(createText, /topic 和 frame/)
    assert.match(createText, /4–7/)
    assert.match(createText, /只生成一层/)
    assert.match(createText, /一个主要拆解口径/)
    assert.match(createText, /一个必要澄清问题/)
    const continueText = exports.__prompts.continuePrompt({ title: 'Branch' })[0].text
    assert.match(continueText, /标为 exploring/)
    assert.match(continueText, /标为 expanded/)
    const exploreText = exports.__prompts.explorePrompt({ title: 'Branch' })[0].text
    assert.match(exploreText, /最多新增 5 个/)
    assert.match(exploreText, /不递归/)
    const organizeText = exports.__prompts.organizePrompt()[0].text
    assert.match(organizeText, /保留.*note.*parked.*selectedIds/)
    const organizeNodeText = exports.__prompts.organizeNodePrompt(sampleMap, sampleMap.nodes[0])[0].text
    assert.match(organizeNodeText, /只整理/)
    assert.match(organizeNodeText, /只调用 brainstorm_map 更新该节点 note/)
    const personalNoteText = exports.__prompts.personalNotePrompt(sampleMap, sampleMap.nodes.find((node) => node.id === 'root-0-child-0'), 'PERSONAL_THOUGHT')[0].text
    assert.match(personalNoteText, /BRAINSTORM_PERSONAL_NOTE/)
    assert.match(personalNoteText, /PERSONAL_THOUGHT/)
    assert.match(personalNoteText, /用户主动/)
    const evaluationText = exports.__prompts.evaluationPrompt(sampleMap, '整体方向', sampleFacts.roots)[0].text
    assert.match(evaluationText, /建议保留/)
    assert.match(evaluationText, /建议合并/)
    assert.match(evaluationText, /建议暂缓/)
    assert.match(evaluationText, /仍需验证/)
    assert.match(evaluationText, /推荐下一步/)
    assert.match(evaluationText, /不调用 brainstorm_map 或 brainstorm_plan/)

    const planText = exports.__prompts.planPrompt(v2Map)[0].text
    assert.match(planText, /graph/)
    assert.match(planText, /completionCriteria/)
    assert.match(planText, /sourceNodeIds/)
    assert.match(planText, /30/)

    const titleGroups = exports.__preparation.candidateGroups(sampleMap, 'Decision detail 2.1')
    assert.equal(titleGroups.length, 1)
    assert.equal(titleGroups[0].root.id, 'root-2')
    assert.equal(titleGroups[0].nodes[0].depth, 2)
    assert.equal(exports.__preparation.candidateGroups(sampleMap, 'Concrete implementation note 1', 'root-4').length, 1, 'candidate filtering searches notes within one Root')

    const planSession = { sessionId: 'plan-session', prompt: async () => ({ ok: true, value: { accepted: true } }) }
    const prepareHtml = renderToStaticMarkup(React.createElement(exports.__components.ExecutionView, {
      map: v2Map,
      session: planSession,
      t: (key) => key,
      onShowMap: () => {},
      onJumpSource: () => {},
    }))
    assert.match(prepareHtml, /plan\.generate/, 'execution preview can generate a plan from the selection pool')
    assert.match(prepareHtml, /plan\.search/)
    assert.match(prepareHtml, /plan\.candidates/)
    assert.match(prepareHtml, /plan\.selected/)
    assert.match(prepareHtml, />A</)
    assert.match(prepareHtml, />B</)

    await assert.rejects(
      () => exports.__queuePrompt({ prompt: async () => ({ ok: false, error: { message: 'queue rejected' } }) }, []),
      /queue rejected/,
    )

    const finalPlanMap = normalizeMap({
      ...v2Map,
      phase: 'executing',
      nodes: v2Map.nodes.map((node) => ({ ...node, status: 'selected' })),
      finalPlan: {
        version: 1,
        generatedAt: '2026-08-21T00:00:00.000Z',
        items: [
          { id: 'plan-1', sourceNodeIds: ['b'], title: '先验证 B', nextStep: '打开真实页面验证 B', done: false },
          { id: 'plan-2', sourceNodeIds: ['a'], title: '再完成 A', nextStep: '提交 A 的实现', note: '保持最短闭环', done: true },
        ],
        uncovered: [{ id: 'gap-1', title: '后续事项', reason: '等待真实数据' }],
      },
    })
    const executionHtml = renderToStaticMarkup(React.createElement(exports.__components.ExecutionView, {
      map: finalPlanMap,
      session: planSession,
      t: (key) => key,
      onShowMap: () => {},
      onJumpSource: () => {},
    }))
    assert.match(executionHtml, /01/)
    assert.match(executionHtml, /02/)
    assert.match(executionHtml, /打开真实页面验证 B/)
    assert.match(executionHtml, /提交 A 的实现/)
    assert.match(executionHtml, /plan\.sources/)
    assert.match(executionHtml, /plan\.uncovered/)
    assert.match(executionHtml, /execution\.back/)
    assert.match(executionHtml, /execution\.export/)
    assert.match(executionHtml, /plan\.regenerate/)

    const projectMap = { ...sampleMap, projectId: 'project-a' }
    const overview = {
      version: 2,
      project: { id: 'project-a', title: 'Ariadne V2', goal: '完成可长期使用的多会话工作台', cwd: '/ws', createdAt: 'x', updatedAt: 'x' },
      generatedAt: 'x',
      totals: { sessions: 1, nodes: sampleMap.nodes.length, roots: 9, links: sampleMap.links.length, unexplored: 0, selected: 1 },
      sessions: [{
        sessionId: 'session-project',
        title: 'Project Session',
        map: projectMap,
        stats: { nodeCount: sampleMap.nodes.length, depthMax: 2, linkCount: sampleMap.links.length, rootCount: 9, selectedCount: 1, statuses: { unexplored: 0, exploring: 0, expanded: sampleMap.nodes.length, parked: 0, selected: 0 } },
        roots: [{ id: 'root-0', title: 'Root direction 0', note: 'Root 0 summary', nodeCount: 4 }],
        selected: [{ id: 'root-0', title: 'Root direction 0' }],
        unexplored: [],
        updatedAt: 'x',
      }],
      related: [{ sessionId: 'related', title: 'Related Session', topic: 'Other topic', reason: '同一工作区' }],
    }
    const projectSession = {
      sessionId: 'session-project',
      projections: {
        faceOf: () => ({ subscribe: () => () => {}, getSnapshot: () => overview }),
      },
    }
    const projectHtml = renderToStaticMarkup(React.createElement(exports.__components.ProjectOverview, {
      session: projectSession,
      map: projectMap,
      t: (key) => key,
      onOpenSession: () => {},
    }))
    assert.match(projectHtml, /Ariadne V2/)
    assert.match(projectHtml, /完成可长期使用的多会话工作台/)
    assert.match(projectHtml, /Project Session/)
    assert.match(projectHtml, /Root direction 0/)
    assert.match(projectHtml, /Related Session/)
    assert.match(projectHtml, /project\.openSession/)

		const exportHtml = renderToStaticMarkup(React.createElement(exports.__components.ExportMenu, {
			session: { sessionId: 'export-session' },
			map: sampleMap,
			offsets: {},
			sizes: {},
			t: (key) => key,
		}))
		assert.match(exportHtml, /action\.more/)

    for (const link of sampleLinks) {
      const source = sampleRects.get(link.from)
      const target = sampleRects.get(link.to)
      const obstacles = nodeRects.filter(([id]) => id !== link.from && id !== link.to).map(([, rect]) => rect)
      const route = exports.__layout.routeOrthogonal(source, target, obstacles)
      assert.equal(route.collisions, 0, `route ${link.from}->${link.to} avoids unrelated nodes`)
      const start = route.points[0]
      const end = route.points.at(-1)
      const onSourceBorder = start.x === source.x || start.x === source.x + source.w || start.y === source.y || start.y === source.y + source.h
      const onTargetBorder = end.x === target.x || end.x === target.x + target.w || end.y === target.y || end.y === target.y + target.h
      assert.equal(onSourceBorder, true, 'source anchor is on its card border')
      assert.equal(onTargetBorder, true, 'target anchor is on its card border')
    }
		const routeBeforeMove = exports.__layout.routeOrthogonal({ x: 0, y: 0, w: 200, h: 80 }, { x: 340, y: 170, w: 200, h: 80 })
		const routeAfterMove = exports.__layout.routeOrthogonal({ x: 0, y: 0, w: 200, h: 80 }, { x: 420, y: 220, w: 260, h: 110 })
		assert.notEqual(routeBeforeMove.d, routeAfterMove.d, 'dragging or resizing a card recomputes its route')
		assert.equal(exports.__layout.noteSummary('First paragraph with useful detail\nSecond paragraph'), 'First paragraph with useful detail', 'node summary uses the first note paragraph')

    const registrations = []
    const ctx = {
      effect(fn) {
        fn()
        return () => {}
      },
      locale: {
        register() {},
        bind() {
          return (key) => key
        },
      },
      slots: {
        inject(_name, callback) {
          const dispose = callback()
          return () => dispose?.()
        },
        register(descriptor, component) {
          registrations.push({ descriptor, component })
          return () => {}
        },
      },
      sessions: {
        binding() {
          return { session: {} }
        },
      },
    }

    exports.apply(ctx)
    const names = registrations.map(({ descriptor }) => `${descriptor.name}:${descriptor.id ?? ''}`)
    assert.ok(names.includes('conversation.view:brainstorm'), 'single Ariadne view tab registered')
		assert.ok(names.includes('conversation.composer.dock:brainstorm-context'), 'Ariadne context reuses the current Session composer')
    assert.equal(names.some((name) => name.startsWith('shell.overlay:')), false, 'legacy Focus Overlay is not registered')
		assert.equal(names.length, 2, 'workbench uses one view and one composer dock')
  } finally {
    delete globalThis.window
  }
})
