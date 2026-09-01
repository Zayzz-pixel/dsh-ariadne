import { normalizeMap, treeFacts } from './map-state.js'

const STATUS_LABELS = {
  unexplored: '未探索',
  exploring: '探索中',
  expanded: '已展开',
  parked: '已暂缓',
  selected: '已定案',
}

const STATUS_COLORS = {
  unexplored: '5',
  exploring: '5',
  expanded: '4',
  parked: '2',
  selected: '6',
}

const EXECUTION_KIND_LABELS = { task: 'Task', decision: 'Decision', checkpoint: 'Checkpoint' }
const RUN_STATUS_LABELS = {
  pending: '待执行', ready: '就绪', running: '执行中', waiting: '等待确认',
  completed: '已完成', failed: '失败', blocked: '已阻塞', cancelled: '已停止',
}

function normalizeExportMap(rawMap) {
  // An undated legacy snapshot must produce the same export on each read.
  const now = rawMap?.updatedAt ?? rawMap?.createdAt ?? rawMap?.finalPlan?.generatedAt ?? '1970-01-01T00:00:00.000Z'
  return normalizeMap(rawMap, { now })
}

function mermaidLabel(value) {
  return String(value ?? '').replace(/[&<>"'|[\]{}()`#\\\r\n]/gu, (character) => `#${character.codePointAt(0)};`)
}

/** Human-readable projection only. Graph ids never become Mermaid syntax. */
export function toExecutionMermaid(graph) {
  const ids = new Map(graph.nodes.map((node, index) => [node.id, `n${index + 1}`]))
  const lines = ['flowchart LR']
  for (const node of graph.nodes) {
    const label = `"${mermaidLabel(`${EXECUTION_KIND_LABELS[node.kind]}: ${node.title}`)}"`
    const shape = node.kind === 'decision' ? `{${label}}` : node.kind === 'checkpoint' ? `[[${label}]]` : `[${label}]`
    lines.push(`    ${ids.get(node.id)}${shape}`)
  }
  for (const edge of graph.edges) {
    const label = `${edge.condition}${edge.routeKey ? `: ${edge.routeKey}` : ''}${edge.label ? ` · ${edge.label}` : ''}`
    lines.push(`    ${ids.get(edge.from)} -->|"${mermaidLabel(label)}"| ${ids.get(edge.to)}`)
  }
  return `${lines.join('\n')}\n`
}

function compactExecutionRun(map) {
  const run = map.executionRun
  if (!run) return undefined
  const nodeStates = Object.create(null)
  for (const node of map.finalPlan.graph.nodes) {
    const result = run.nodeStates[node.id]
    if (!result || result.status === 'pending') continue
    const { status, attempts, summary, outputRefs, evidence, routeKey, startedAt, completedAt } = result
    nodeStates[node.id] = {
      status, attempts,
      ...(summary === undefined ? {} : { summary }),
      ...(outputRefs === undefined ? {} : { outputRefs }),
      ...(evidence === undefined ? {} : { evidence }),
      ...(routeKey === undefined ? {} : { routeKey }),
      ...(startedAt === undefined ? {} : { startedAt }),
      ...(completedAt === undefined ? {} : { completedAt }),
    }
  }
  return {
    version: run.version,
    id: run.id,
    planGeneratedAt: run.planGeneratedAt,
    status: run.status,
    ...(run.currentNodeId === undefined ? {} : { currentNodeId: run.currentNodeId }),
    nodeStates,
    startedAt: run.startedAt,
    updatedAt: run.updatedAt,
    ...(run.completedAt === undefined ? {} : { completedAt: run.completedAt }),
  }
}

function executionDocument(rawMap, metadata) {
  const map = normalizeExportMap(rawMap)
  if (!map.finalPlan?.graph) throw new Error('Execution export requires a Final Plan')
  const byId = new Map(map.nodes.map((node) => [node.id, node]))
  const projectId = map.projectId ?? metadata.project?.id
  const project = metadata.project ? {
    ...(metadata.project.title ? { title: metadata.project.title } : {}),
    ...(metadata.project.goal ? { goal: metadata.project.goal } : {}),
  } : undefined
  const executionRun = compactExecutionRun(map)
  return {
    schema: 'dsh.brainstorm.execution',
    version: 1,
    ...(metadata.sessionId ? { sessionId: metadata.sessionId } : {}),
    topic: map.topic,
    ...(projectId ? { projectId } : {}),
    ...(project && Object.keys(project).length ? { project } : {}),
    ...(map.frame ? { frame: map.frame } : {}),
    sources: map.selectedIds.map((id) => {
      const node = byId.get(id)
      return { id, title: node.title, ...(node.note ? { note: node.note } : {}) }
    }),
    finalPlan: map.finalPlan,
    ...(executionRun ? { executionRun } : {}),
  }
}

/** Portable machine-readable plan, with source context and optional run results. */
export function toExecutionJson(rawMap, metadata = {}) {
  return `${JSON.stringify(executionDocument(rawMap, metadata), null, 2)}\n`
}

function listLines(values) {
  return values?.length ? values.map((value) => `- ${String(value).replace(/\n/gu, '\n  ')}`) : ['- 无']
}

function executionPlanLines(plan, sources, run) {
  const byId = new Map(sources.map((node) => [node.id, node]))
  const lines = [
    `- 计划生成时间：${plan.generatedAt}`,
    `- 起始节点：${plan.graph.nodes.find((node) => node.id === plan.graph.startNodeId)?.title ?? plan.graph.startNodeId}`,
    '', '```mermaid', toExecutionMermaid(plan.graph).trimEnd(), '```', '',
  ]
  for (const [index, node] of plan.graph.nodes.entries()) {
    lines.push(`### ${index + 1}. ${node.title}`, '',
      `- ID：${node.id}`,
      `- 类型：${EXECUTION_KIND_LABELS[node.kind]}`,
      `- 来源节点：${node.sourceNodeIds.map((id) => `${byId.get(id)?.title ?? id} (${id})`).join('、') || '无'}`,
      '', '#### 指令', '', node.instruction,
      '', '#### 所需输入', '', ...listLines(node.requiredInputs),
      '', '#### 预期产出', '', ...listLines(node.expectedOutputs),
      '', '#### 完成条件', '', ...listLines(node.completionCriteria), '')
  }
  lines.push('### 未覆盖事项', '')
  lines.push(...listLines(plan.uncovered.map((gap) => `${gap.title}${gap.reason ? `：${gap.reason}` : ''}`)))
  if (run) {
    lines.push('', '### 运行摘要', '',
      `- Run：${run.id}`,
      `- 状态：${RUN_STATUS_LABELS[run.status]} (${run.status})`,
      `- 开始时间：${run.startedAt}`,
      `- 更新时间：${run.updatedAt}`)
    if (run.currentNodeId) {
      const current = plan.graph.nodes.find((node) => node.id === run.currentNodeId)
      lines.push(`- 当前节点：${current?.title ?? run.currentNodeId} (${run.currentNodeId})`)
    }
    if (run.completedAt) lines.push(`- 完成时间：${run.completedAt}`)
    for (const node of plan.graph.nodes) {
      const result = run.nodeStates[node.id]
      if (!result || result.status === 'pending') continue
      lines.push('', `#### ${node.title} (${node.id})`, '',
        `- 状态：${RUN_STATUS_LABELS[result.status]} (${result.status})`,
        `- 尝试次数：${result.attempts}`)
      if (result.summary) lines.push(`- 摘要：${result.summary.replace(/\n/gu, '\n  ')}`)
      if (result.routeKey) lines.push(`- 路由：${result.routeKey}`)
      if (result.outputRefs?.length) lines.push('', '产出引用：', '', ...listLines(result.outputRefs))
      if (result.evidence?.length) lines.push('', '证据：', '', ...listLines(result.evidence))
    }
  }
  return lines
}

export function toExecutionMarkdown(rawMap, metadata = {}) {
  const data = executionDocument(rawMap, metadata)
  const lines = [`# ${data.topic} · 执行图`, '']
  if (data.sessionId) lines.push(`- Session：${data.sessionId}`)
  if (data.projectId) lines.push(`- Project：${data.projectId}`)
  if (data.project?.title) lines.push(`- 项目：${data.project.title}`)
  if (data.project?.goal) lines.push(`- 项目目标：${data.project.goal}`)
  lines.push(`- Session Goal：${data.frame?.goal || '未设置'}`,
    `- 组织口径：${data.frame?.organizingPrinciple || '未设置'}`,
    '', '## Execution Graph', '', ...executionPlanLines(data.finalPlan, data.sources, data.executionRun),
    '', '## 来源上下文', '')
  for (const source of data.sources) {
    lines.push(`### ${source.title} (${source.id})`, '', source.note || '无补充记录', '')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

function hexId(index) {
  return index.toString(16).padStart(16, '0')
}

function cleanRect(value, index) {
  if (value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.w) && Number.isFinite(value.h)) {
    return {
      x: Math.round(value.x),
      y: Math.round(value.y),
      width: Math.max(120, Math.round(value.w)),
      height: Math.max(60, Math.round(value.h)),
    }
  }
  return {
    x: (index % 5) * 340,
    y: Math.floor(index / 5) * 180,
    width: 280,
    height: 120,
  }
}

function edgeSides(from, to) {
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ['right', 'left'] : ['left', 'right']
  return dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom']
}

export function mapMarkdown(rawMap) {
  const map = normalizeExportMap(rawMap)
  const facts = treeFacts(map)
  const selected = new Set(map.selectedIds)
  const lines = [
    `# ${map.topic}`,
    '',
    `> Phase：${map.phase} · 节点：${map.nodes.length} · Root：${facts.roots.length} · Parent：${map.links.length} · 定案池：${map.selectedIds.length}`,
    ...(map.projectId ? [`> Project：${map.projectId}`] : []),
    ...(map.frame?.goal ? [`> Session Goal：${map.frame.goal}`] : []),
    ...(map.frame?.organizingPrinciple ? [`> 组织口径：${map.frame.organizingPrinciple}`] : []),
    '',
    '## Ariadne Map',
    '',
  ]
  const writeNode = (id, depth) => {
    const node = facts.byId.get(id)
    const mark = selected.has(id) ? ' ◆' : ''
    lines.push(`${'  '.repeat(depth)}- **${node.title}**${mark} _${STATUS_LABELS[node.status]}_`)
    if (node.note) lines.push(`${'  '.repeat(depth + 1)}- ${node.note}`)
    if (node.userNote) {
      const indent = '  '.repeat(depth + 1)
      lines.push(`${indent}- **我的笔记**`)
      lines.push(...node.userNote.split('\n').map((line) => `${indent}  ${line}`))
    }
    for (const child of facts.childrenById.get(id) ?? []) writeNode(child, depth + 1)
  }
  for (const id of facts.roots) writeNode(id, 0)

  lines.push('', '## 定案池', '')
  if (map.selectedIds.length === 0) lines.push('- 无')
  else for (const id of map.selectedIds) lines.push(`- ${facts.byId.get(id)?.title ?? id}`)

  if (map.finalPlan) {
    lines.push('', '## Final Plan', '')
    lines.push(...executionPlanLines(map.finalPlan, map.nodes, compactExecutionRun(map)))
  }
  return `${lines.join('\n').trimEnd()}\n`
}

export function mapToJsonCanvas(rawMap, rects = {}) {
  const map = normalizeMap(rawMap)
  const nodeIdByMapId = new Map(map.nodes.map((node, index) => [node.id, hexId(index + 1)]))
  const canvasRects = new Map()
  const nodes = map.nodes.map((node, index) => {
    const rect = cleanRect(rects[node.id], index)
    canvasRects.set(node.id, rect)
    const meta = [`状态：${STATUS_LABELS[node.status]}`, `来源：${node.source === 'user' ? '用户' : 'Agent'}`]
    if (map.selectedIds.includes(node.id)) meta.push('定案池：是')
    const content = [node.note, node.userNote ? `## 我的笔记\n\n${node.userNote}` : ''].filter(Boolean)
    return {
      id: nodeIdByMapId.get(node.id),
      type: 'text',
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: STATUS_COLORS[node.status],
      text: `# ${node.title}${content.length ? `\n\n${content.join('\n\n')}` : ''}\n\n${meta.join(' · ')}`,
    }
  })
  const edges = map.links.map((link, index) => {
    const [fromSide, toSide] = edgeSides(canvasRects.get(link.from), canvasRects.get(link.to))
    return {
      id: hexId(map.nodes.length + index + 1),
      fromNode: nodeIdByMapId.get(link.from),
      fromSide,
      fromEnd: 'none',
      toNode: nodeIdByMapId.get(link.to),
      toSide,
      toEnd: 'arrow',
      ...(link.label ? { label: link.label } : {}),
    }
  })
  return { nodes, edges }
}

export function validateJsonCanvas(canvas) {
  const ids = new Set()
  for (const item of [...canvas.nodes, ...canvas.edges]) {
    if (!/^[0-9a-f]{16}$/.test(item.id)) throw new Error(`invalid JSON Canvas id ${JSON.stringify(item.id)}`)
    if (ids.has(item.id)) throw new Error(`duplicate JSON Canvas id ${item.id}`)
    ids.add(item.id)
  }
  const nodeIds = new Set(canvas.nodes.map((node) => node.id))
  for (const edge of canvas.edges) {
    if (!nodeIds.has(edge.fromNode) || !nodeIds.has(edge.toNode)) throw new Error(`dangling JSON Canvas edge ${edge.id}`)
  }
  return canvas
}

export function jsonCanvasText(map, rects) {
  return `${JSON.stringify(validateJsonCanvas(mapToJsonCanvas(map, rects)), null, 2)}\n`
}
