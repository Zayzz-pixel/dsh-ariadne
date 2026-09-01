import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyDirectOps, applyOps } from '../lib/map-state.js'
import {
  jsonCanvasText, mapMarkdown, mapToJsonCanvas, validateJsonCanvas,
  toExecutionJson, toExecutionMarkdown, toExecutionMermaid,
} from '../lib/export.js'

const NOW = '2026-08-23T00:00:00.000Z'

function sample() {
  const map = applyOps(null, {
    topic: 'Export sample',
    projectId: 'project-a',
    frame: { goal: '形成可执行方案', organizingPrinciple: '按价值与约束组织' },
    upsertNodes: [
      { id: 'root', title: 'Root', note: 'Root note', status: 'expanded', source: 'user' },
      { id: 'child', parentId: 'root', title: 'Child', status: 'parked', source: 'agent' },
      { id: 'other', title: 'Other Root', status: 'unexplored', source: 'user' },
    ],
    selectedIds: ['root'],
  }, { now: NOW }).map
  return applyDirectOps(map, { type: 'set-user-note', nodeId: 'root', userNote: 'Personal thought\nSecond line' }, { now: NOW })
}

function executionSample(withRun = true) {
  const node = (id, kind, title, instruction) => ({
    id, kind, title, instruction, sourceNodeIds: ['root'],
    requiredInputs: [`${id} 输入`],
    expectedOutputs: [`${id} 产物`],
    completionCriteria: [`${id} 可检查验收条件`],
  })
  return {
    ...sample(),
    phase: 'executing',
    finalPlan: {
      version: 2,
      generatedAt: NOW,
      graph: {
        startNodeId: 'inspect',
        nodes: [
          node('inspect', 'task', '审阅当前工程', '阅读项目文件，形成问题清单。\n保留证据路径。'),
          node('decide', 'decision', '检查结果是否满足条件', '依据检查结果选择 passed 或 failed。'),
          node('review', 'checkpoint', '用户确认', '等待用户审阅并批准。'),
          node('fix', 'task', '修复问题', '修复明确发现的问题。'),
          node('blocked', 'task', '记录阻塞', '汇总未解决问题和影响。'),
        ],
        edges: [
          { id: 'e1', from: 'inspect', to: 'decide', condition: 'success', label: '检查完成' },
          { id: 'e2', from: 'inspect', to: 'blocked', condition: 'failure', label: '无法检查' },
          { id: 'e3', from: 'decide', to: 'review', condition: 'route', routeKey: 'passed', label: '通过' },
          { id: 'e4', from: 'decide', to: 'fix', condition: 'route', routeKey: 'failed', label: '需修复' },
          { id: 'e5', from: 'fix', to: 'review', condition: 'success' },
        ],
      },
      uncovered: [{ id: 'gap-1', title: '外部数据更新', reason: '等待外部数据源开放' }],
    },
    ...(withRun ? {
      executionRun: {
        version: 1,
        id: 'run-export',
        planGeneratedAt: NOW,
        status: 'waiting',
        currentNodeId: 'review',
        startedAt: NOW,
        updatedAt: '2026-08-23T00:10:00.000Z',
        nodeStates: {
          inspect: {
            status: 'completed', attempts: 1, summary: '检查完成，未发现阻塞。',
            outputRefs: ['reports/inspection.md'], evidence: ['npm test: 12 passed'],
            startedAt: NOW, completedAt: '2026-08-23T00:05:00.000Z',
          },
          decide: { status: 'completed', attempts: 1, summary: '条件满足', routeKey: 'passed' },
          review: { status: 'waiting', attempts: 0 },
          fix: { status: 'pending', attempts: 0 },
          blocked: { status: 'pending', attempts: 0 },
        },
      },
    } : {}),
  }
}

test('Markdown export preserves topic, tree, notes, statuses and selection pool', () => {
  const markdown = mapMarkdown(sample())
  assert.match(markdown, /^# Export sample/m)
  assert.match(markdown, /\*\*Root\*\* ◆ _已展开_/)
  assert.match(markdown, /Root note/)
  assert.match(markdown, /\*\*我的笔记\*\*[\s\S]*Personal thought[\s\S]*Second line/)
  assert.match(markdown, /  - \*\*Child\*\* _已暂缓_/)
  assert.match(markdown, /Project：project-a/)
  assert.match(markdown, /Session Goal：形成可执行方案/)
  assert.match(markdown, /组织口径：按价值与约束组织/)
  assert.match(markdown, /## 定案池\n\n- Root/)
})

test('JSON Canvas keeps one node per map node and one edge per Parent link', () => {
  const map = sample()
  const canvas = mapToJsonCanvas(map, {
    root: { x: 10, y: 20, w: 240, h: 100 },
    child: { x: 400, y: 20, w: 220, h: 90 },
    other: { x: 10, y: 260, w: 260, h: 100 },
  })
  validateJsonCanvas(canvas)
  assert.equal(canvas.nodes.length, map.nodes.length)
  assert.equal(canvas.edges.length, map.links.length)
  assert.deepEqual(canvas.nodes[0], {
    id: '0000000000000001', type: 'text', x: 10, y: 20, width: 240, height: 100, color: '4',
    text: '# Root\n\nRoot note\n\n## 我的笔记\n\nPersonal thought\nSecond line\n\n状态：已展开 · 来源：用户 · 定案池：是',
  })
  assert.equal(canvas.edges[0].fromSide, 'right')
  assert.equal(canvas.edges[0].toSide, 'left')
  assert.equal(JSON.parse(jsonCanvasText(map, {})).nodes.length, 3)
})

test('JSON Canvas validation rejects duplicate ids and dangling edges', () => {
  assert.throws(() => validateJsonCanvas({ nodes: [{ id: '0000000000000001' }, { id: '0000000000000001' }], edges: [] }), /duplicate/)
  assert.throws(() => validateJsonCanvas({ nodes: [], edges: [{ id: '0000000000000001', fromNode: 'missing', toNode: 'missing' }] }), /dangling/)
})

test('Execution JSON has one canonical graph with metadata, source context, gaps and compact run results', () => {
  const map = executionSample()
  const metadata = { sessionId: 'session-export', project: { id: 'project-a', title: '升级项目', goal: '交付可运行版本' } }
  const json = toExecutionJson(map, metadata)
  const data = JSON.parse(json)
  assert.equal(json, toExecutionJson(map, metadata))
  assert.equal(data.schema, 'dsh.brainstorm.execution')
  assert.equal(data.version, 1)
  assert.equal(data.sessionId, metadata.sessionId)
  assert.equal(data.topic, map.topic)
  assert.equal(data.projectId, 'project-a')
  assert.deepEqual(data.project, { title: '升级项目', goal: '交付可运行版本' })
  assert.deepEqual(data.frame, map.frame)
  assert.deepEqual(data.sources, [{ id: 'root', title: 'Root', note: 'Root note' }])
  assert.equal(JSON.stringify(data).includes('Personal thought'), false, 'Execution export excludes personal notes until the user explicitly shares them')
  assert.equal(data.finalPlan.version, 2)
  assert.deepEqual(data.finalPlan.graph, map.finalPlan.graph)
  assert.deepEqual(data.finalPlan.uncovered, map.finalPlan.uncovered)
  assert.equal('items' in data.finalPlan, false)
  assert.equal('graph' in data, false)
  assert.equal('mermaid' in data, false)
  assert.equal(data.executionRun.status, 'waiting')
  assert.equal(data.executionRun.currentNodeId, 'review')
  assert.deepEqual(Object.keys(data.executionRun.nodeStates), ['inspect', 'decide', 'review'])
  assert.equal(data.executionRun.nodeStates.inspect.summary, '检查完成，未发现阻塞。')
  assert.deepEqual(data.executionRun.nodeStates.inspect.outputRefs, ['reports/inspection.md'])
  assert.deepEqual(data.executionRun.nodeStates.inspect.evidence, ['npm test: 12 passed'])
  assert.equal(data.executionRun.nodeStates.decide.routeKey, 'passed')

  const reorderedRun = structuredClone(map)
  reorderedRun.executionRun.nodeStates = Object.fromEntries(Object.entries(reorderedRun.executionRun.nodeStates).reverse())
  assert.equal(toExecutionJson(reorderedRun, metadata), json)
})

test('Execution exports keep an unstarted plan free of run state and reject a missing plan', () => {
  const map = executionSample(false)
  assert.equal('executionRun' in JSON.parse(toExecutionJson(map)), false)
  assert.doesNotMatch(toExecutionMarkdown(map), /运行摘要/)
  assert.throws(() => toExecutionJson(sample()), /requires a Final Plan/)
  assert.throws(() => toExecutionMarkdown(sample()), /requires a Final Plan/)
})

test('Mermaid declares every graph node and edge once with generated ids and escaped labels', () => {
  const unsafeId = 'a["]\nclick n1 "https://example.invalid"'
  const graph = {
    startNodeId: unsafeId,
    nodes: [
      { id: unsafeId, kind: 'task', title: '审阅 "A&B" [draft] <spec> | `code`\n下一步' },
      { id: 'end', kind: 'decision', title: '是否通过 (测试)？' },
      { id: 'n1', kind: 'checkpoint', title: '用户 {确认}' },
    ],
    edges: [
      { id: 'edge 1', from: unsafeId, to: 'end', condition: 'success', label: '"result" | <ok>' },
      { id: 'edge 2', from: unsafeId, to: 'n1', condition: 'failure', label: 'false & true' },
      { id: 'edge 3', from: 'end', to: 'n1', condition: 'route', routeKey: 'pass|"quoted"', label: '通过' },
      { id: 'edge 4', from: 'end', to: 'n1', condition: 'route', routeKey: 'fail #60;', label: '未通过' },
    ],
  }
  const mermaid = toExecutionMermaid(graph)
  assert.equal(mermaid, toExecutionMermaid(structuredClone(graph)))
  assert.equal(mermaid.split('\n').filter((line) => /^\s+n\d+[[{]/u.test(line)).length, graph.nodes.length)
  assert.equal(mermaid.split('\n').filter((line) => /^\s+n\d+ -->\|"[^"\r\n]*"\| n\d+$/u.test(line)).length, graph.edges.length)
  assert.match(mermaid, /n1\["Task:/u)
  assert.match(mermaid, /n2\{"Decision:/u)
  assert.match(mermaid, /n3\[\["Checkpoint:/u)
  assert.doesNotMatch(mermaid, /click n1|https:\/\/example|<spec>|<ok>|`code`/u)
  for (const entity of ['#34;', '#38;', '#91;', '#93;', '#60;', '#62;', '#124;', '#96;', '#10;', '#40;', '#41;', '#123;', '#125;', '#35;']) {
    assert.ok(mermaid.includes(entity), `missing escaped character ${entity}`)
  }
  const labels = [...mermaid.matchAll(/-->\|"([^"]*)"\|/gu)]
    .map((match) => match[1].replace(/#(\d+);/gu, (_, number) => String.fromCodePoint(Number(number))))
  assert.deepEqual(labels, graph.edges.map((edge) => `${edge.condition}${edge.routeKey ? `: ${edge.routeKey}` : ''}${edge.label ? ` · ${edge.label}` : ''}`))
})

test('Execution Markdown includes the full plan, Frame, source labels, uncovered reasons and run evidence', () => {
  const map = executionSample()
  const metadata = { sessionId: 'session-export', project: { id: 'project-a', title: '升级项目', goal: '交付可运行版本' } }
  const markdown = toExecutionMarkdown(map, metadata)
  assert.equal(markdown, toExecutionMarkdown(map, metadata))
  assert.ok(markdown.includes(toExecutionMermaid(map.finalPlan.graph).trimEnd()))
  for (const node of map.finalPlan.graph.nodes) {
    for (const value of [node.title, node.instruction, ...node.requiredInputs, ...node.expectedOutputs, ...node.completionCriteria]) {
      assert.ok(markdown.includes(value), `missing node content: ${value}`)
    }
  }
  for (const value of [
    '形成可执行方案', '按价值与约束组织', 'session-export', 'project-a', '升级项目', '交付可运行版本',
    '来源节点：Root (root)', 'Root note', '外部数据更新：等待外部数据源开放',
    '运行摘要', 'waiting', '检查完成，未发现阻塞。', 'reports/inspection.md', 'npm test: 12 passed', '路由：passed',
  ]) assert.ok(markdown.includes(value), `missing export content: ${value}`)
  const mapText = mapMarkdown(map)
  assert.match(mapText, /## Ariadne Map/u)
  assert.match(mapText, /## Final Plan/u)
  assert.match(mapText, /```mermaid/u)
  assert.ok(mapText.includes(map.finalPlan.graph.nodes[0].instruction))
})

test('Legacy plans export as V2 via normalization while keeping notes and completed results', () => {
  const map = {
    ...sample(),
    phase: 'executing',
    finalPlan: {
      version: 1,
      items: [
        { id: 'legacy-one', title: '旧步骤一', nextStep: '完成第一步工作', sourceNodeIds: ['root'], note: '保留旧记录', done: true },
        { id: 'legacy-two', title: '旧步骤二', nextStep: '完成第二步工作', sourceNodeIds: ['root'], done: false },
      ],
      uncovered: [{ id: 'legacy-gap', title: '旧缺口', reason: '缺少资料' }],
      generatedAt: NOW,
    },
  }
  const data = JSON.parse(toExecutionJson(map))
  assert.equal(data.finalPlan.version, 2)
  assert.equal(data.finalPlan.graph.nodes.length, 2)
  assert.equal(data.finalPlan.graph.edges.length, 1)
  assert.equal(data.executionRun.status, 'ready')
  assert.equal(data.executionRun.nodeStates[data.finalPlan.graph.nodes[0].id].status, 'completed')
  for (const value of ['完成第一步工作', '完成第二步工作', '保留旧记录', '旧缺口：缺少资料']) {
    assert.ok(toExecutionMarkdown(map).includes(value))
    assert.ok(mapMarkdown(map).includes(value))
  }
  delete map.createdAt
  delete map.updatedAt
  delete map.finalPlan.generatedAt
  assert.equal(toExecutionJson(map), toExecutionJson(structuredClone(map)))
})

test('Execution graphs do not add workflow nodes or edges to Map JSON Canvas', () => {
  const map = executionSample()
  const canvas = mapToJsonCanvas(map)
  validateJsonCanvas(canvas)
  assert.equal(canvas.nodes.length, map.nodes.length)
  assert.equal(canvas.edges.length, map.links.length)
  assert.equal(canvas.nodes[0].text, '# Root\n\nRoot note\n\n## 我的笔记\n\nPersonal thought\nSecond line\n\n状态：已定案 · 来源：用户 · 定案池：是')
  assert.equal(canvas.edges[0].fromNode, '0000000000000001')
  assert.equal(canvas.edges[0].toNode, '0000000000000002')
})
