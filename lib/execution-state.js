/** Pure Final Plan v2 and single-current-node Execution Run state engine. */
import { randomUUID } from 'node:crypto'

export const EXECUTION_NODE_KINDS = ['task', 'decision', 'checkpoint']
export const EXECUTION_EDGE_CONDITIONS = ['success', 'failure', 'route']
export const EXECUTION_RUN_STATUSES = ['ready', 'running', 'waiting', 'blocked', 'completed', 'cancelled']
export const EXECUTION_NODE_STATUSES = ['pending', 'ready', 'running', 'waiting', 'completed', 'failed', 'blocked']
export const MAX_EXECUTION_NODES = 30

const GRAPH_ERROR = 'BRAINSTORM_EXECUTION_GRAPH_ERROR'
const RUN_ERROR = 'BRAINSTORM_EXECUTION_RUN_ERROR'
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u

function fail(message, code = GRAPH_ERROR) {
  const error = new Error(message)
  error.code = code
  throw error
}

function text(value, limit, field, required = false, code = GRAPH_ERROR) {
  if (value === undefined || value === null) value = ''
  if (typeof value !== 'string') fail(`${field} must be a string`, code)
  const result = value.trim().slice(0, limit)
  if (required && !result) fail(`${field} must be non-empty`, code)
  return result
}

function strings(value, field, limit = 1000, code = GRAPH_ERROR) {
  if (value === undefined) return []
  if (!Array.isArray(value)) fail(`${field} must be an array`, code)
  return value.slice(0, 20).map((entry) => text(entry, limit, field, false, code)).filter(Boolean)
}

function sourceIds(value, field = 'sourceNodeIds') {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !id || id.length > 80)) fail(`${field} must contain node IDs`)
  return [...new Set(value)]
}

function validId(value, field, code = GRAPH_ERROR) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) fail(`${field} must be a safe ID of 1–80 characters`, code)
  return value
}

function cleanRouteKey(value, required = true, code = GRAPH_ERROR) {
  if (typeof value === 'string' && value.trim().length > 80) fail('routeKey must be at most 80 characters', code)
  return text(value, 80, 'routeKey', required, code)
}

function nowOf(options) {
  return options.now ?? new Date().toISOString()
}

function generatedIds(values, prefix, legacy = false) {
  const occupied = new Set(values.map((value) => value?.id).filter((id) => SAFE_ID.test(id ?? '')))
  return values.map((value, index) => {
    if (value?.id !== undefined && (!legacy || SAFE_ID.test(value.id))) return validId(value.id, `${prefix} id`)
    let suffix = index + 1
    while (occupied.has(`${prefix}-${suffix}`)) suffix++
    const id = `${prefix}-${suffix}`
    occupied.add(id)
    return id
  })
}

function legacyCriteria(note) {
  const criteria = []
  let inCriteria = false
  for (const line of String(note ?? '').split('\n')) {
    const heading = line.trim().match(/^(?:#{1,6}\s*)?(?:验收条件|验收标准|验收|completion criteria|acceptance criteria)\s*[:：]?\s*(.*)$/iu)
    if (heading) {
      inCriteria = true
      if (heading[1]) criteria.push(heading[1])
    } else if (inCriteria && /^\s*#/u.test(line)) {
      inCriteria = false
    } else if (inCriteria && /^\s*(?:[-*]|\d+[.)])\s+/u.test(line)) {
      criteria.push(line.trim().replace(/^(?:[-*]|\d+[.)])\s+/u, ''))
    } else if (line.trim()) {
      inCriteria = false
    }
  }
  return criteria.length ? strings(criteria, 'completionCriteria') : ['完成该步骤要求并形成可检查产物']
}

/** Read legacy lists into one authoritative graph; new writes retain no items. */
export function normalizeFinalPlan(raw, options = {}) {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== 'object' || Array.isArray(raw)) fail('Final Plan must be an object')
  if (raw.version !== undefined && raw.version !== 1 && raw.version !== 2) fail('unsupported Final Plan version')
  const legacy = !raw.graph && Array.isArray(raw.items) && raw.version !== 2
  let graph = raw.graph
  if (legacy) {
    const ids = generatedIds(raw.items, 'exec-node', true)
    graph = {
      startNodeId: ids[0],
      nodes: raw.items.map((item, index) => ({
        id: ids[index],
        kind: 'task',
        title: item?.title,
        instruction: [text(item?.nextStep, 4000, 'nextStep', true), text(item?.note, 2000, 'note')].filter(Boolean).join('\n\n'),
        sourceNodeIds: item?.sourceNodeIds,
        completionCriteria: legacyCriteria(item?.note),
      })),
      edges: ids.slice(1).map((id, index) => ({ id: `exec-edge-${index + 1}`, from: ids[index], to: id, condition: 'success' })),
    }
  }
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) fail('Final Plan requires graph nodes and edges')
  const nodeIds = generatedIds(graph.nodes, 'exec-node')
  const edgeIds = generatedIds(graph.edges, 'exec-edge')
  const nodes = graph.nodes.map((node, index) => {
    if (!node || typeof node !== 'object') fail('graph node must be an object')
    const requiredInputs = strings(node.requiredInputs, 'requiredInputs')
    const expectedOutputs = strings(node.expectedOutputs, 'expectedOutputs')
    return {
      id: nodeIds[index],
      kind: node.kind ?? 'task',
      title: text(node.title, 200, 'title', true).replace(/\s+/gu, ' '),
      instruction: text(node.instruction, 6000, 'instruction', true),
      sourceNodeIds: sourceIds(node.sourceNodeIds),
      ...(requiredInputs.length ? { requiredInputs } : {}),
      ...(expectedOutputs.length ? { expectedOutputs } : {}),
      completionCriteria: strings(node.completionCriteria, 'completionCriteria'),
    }
  })
  const edges = graph.edges.map((edge, index) => {
    if (!edge || typeof edge !== 'object') fail('graph edge must be an object')
    const label = text(edge.label, 200, 'edge label')
    return {
      id: edgeIds[index], from: edge.from, to: edge.to, condition: edge.condition,
      ...(edge.routeKey === undefined ? {} : { routeKey: cleanRouteKey(edge.routeKey) }),
      ...(label ? { label } : {}),
    }
  })
  if (raw.uncovered !== undefined && !Array.isArray(raw.uncovered)) fail('uncovered must be an array')
  const selected = new Set(options.selectedIds ?? [])
  const uncovered = (raw.uncovered ?? []).map((gap, index) => {
    if (!gap || typeof gap !== 'object') fail('uncovered gap must be an object')
    const title = text(gap.title, 200, 'gap title', true)
    const reason = text(gap.reason, 1000, 'gap reason')
    let ids = sourceIds(gap.sourceNodeIds, 'gap sourceNodeIds')
    if (legacy && ids.length === 0 && reason) {
      const key = (value) => String(value).trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US')
      const matches = (options.sourceNodes ?? []).filter((node) => selected.has(node.id) && key(node.title) === key(title))
      if (matches.length === 1) ids = [matches[0].id]
    }
    return { id: String(gap.id ?? `gap-${index + 1}`), title, ...(reason ? { reason } : {}), ...(ids.length ? { sourceNodeIds: ids } : {}) }
  })
  const plan = {
    version: 2,
    graph: { startNodeId: graph.startNodeId, nodes, edges },
    uncovered,
    generatedAt: text(raw.generatedAt, 100, 'generatedAt') || nowOf(options),
  }
  validateExecutionGraph(plan.graph, { ...options, uncovered })
  return plan
}

/** Validate the bounded DAG and its selected-source coverage. Returns graph. */
export function validateExecutionGraph(graph, options = {}) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) fail('graph requires nodes and edges arrays')
  if (graph.nodes.length < 1 || graph.nodes.length > MAX_EXECUTION_NODES) fail(`graph requires 1–${MAX_EXECUTION_NODES} nodes`)
  const byId = new Map()
  for (const node of graph.nodes) {
    if (!node || typeof node !== 'object') fail('graph node must be an object')
    validId(node.id, 'node id')
    if (byId.has(node.id)) fail(`duplicate node id ${node.id}`)
    byId.set(node.id, node)
    if (!EXECUTION_NODE_KINDS.includes(node.kind)) fail(`invalid node kind ${node.kind}`)
    text(node.title, 200, 'title', true)
    text(node.instruction, 6000, 'instruction', true)
    if (!Array.isArray(node.completionCriteria) || node.completionCriteria.length === 0 || node.completionCriteria.some((value) => typeof value !== 'string' || !value.trim())) fail(`node ${node.id} requires non-empty completionCriteria`)
    sourceIds(node.sourceNodeIds)
    strings(node.requiredInputs, 'requiredInputs')
    strings(node.expectedOutputs, 'expectedOutputs')
  }
  if (!byId.has(graph.startNodeId)) fail('startNodeId must reference an existing node')
  const outgoing = new Map(graph.nodes.map((node) => [node.id, []]))
  const edgeIds = new Set()
  for (const edge of graph.edges) {
    if (!edge || typeof edge !== 'object') fail('graph edge must be an object')
    validId(edge.id, 'edge id')
    if (edgeIds.has(edge.id)) fail(`duplicate edge id ${edge.id}`)
    edgeIds.add(edge.id)
    if (!byId.has(edge.from) || !byId.has(edge.to)) fail(`edge ${edge.id} has an unknown endpoint`)
    if (edge.from === edge.to) fail(`edge ${edge.id} cannot be a self-loop`)
    if (!EXECUTION_EDGE_CONDITIONS.includes(edge.condition)) fail(`invalid edge condition ${edge.condition}`)
    if (edge.condition === 'route') {
      if (cleanRouteKey(edge.routeKey) !== edge.routeKey) fail('routeKey must be trimmed')
    } else if (edge.routeKey !== undefined) fail('only route edges may have routeKey')
    outgoing.get(edge.from).push(edge)
  }
  for (const node of graph.nodes) {
    const edges = outgoing.get(node.id)
    const successes = edges.filter((edge) => edge.condition === 'success')
    const failures = edges.filter((edge) => edge.condition === 'failure')
    const routes = edges.filter((edge) => edge.condition === 'route')
    if (node.kind === 'task' && (successes.length > 1 || failures.length > 1 || routes.length)) fail(`task ${node.id} allows at most one success and one failure edge, and no routes`)
    if (node.kind === 'checkpoint' && (successes.length > 1 || failures.length || routes.length)) fail(`checkpoint ${node.id} allows only one success edge`)
    if (node.kind === 'decision' && (routes.length < 2 || successes.length || failures.length > 1 || new Set(routes.map((edge) => edge.routeKey)).size !== routes.length)) fail(`decision ${node.id} requires at least two unique routes, no success edge, and at most one failure edge`)
  }
  const visiting = new Set()
  const visited = new Set()
  function visit(id) {
    if (visiting.has(id)) fail('execution graph must be acyclic')
    if (visited.has(id)) return
    visiting.add(id)
    outgoing.get(id).forEach((edge) => visit(edge.to))
    visiting.delete(id)
    visited.add(id)
  }
  visit(graph.startNodeId)
  if (visited.size !== byId.size) fail('all graph nodes must be reachable from startNodeId')
  if (options.selectedIds !== undefined) {
    const selected = new Set(options.selectedIds)
    const sources = options.sourceNodes === undefined ? undefined : new Set(options.sourceNodes.map((node) => node.id))
    const covered = new Set()
    function cover(ids) {
      for (const id of ids) {
        if (!selected.has(id) || (sources && !sources.has(id))) fail(`sourceNodeIds references an unselected or missing node ${id}`)
        covered.add(id)
      }
    }
    graph.nodes.forEach((node) => cover(sourceIds(node.sourceNodeIds)))
    for (const gap of options.uncovered ?? []) {
      const ids = sourceIds(gap.sourceNodeIds, 'gap sourceNodeIds')
      for (const id of ids) if (!selected.has(id) || (sources && !sources.has(id))) fail(`gap references an unselected or missing node ${id}`)
      if (typeof gap.reason === 'string' && gap.reason.trim()) cover(ids)
    }
    for (const id of selected) if (!covered.has(id)) fail(`selected node ${id} is not covered by the graph or an explained uncovered gap`)
  }
  return graph
}

/** Empty for a branching/nonlinear graph; never chooses a branch implicitly. */
export function linearExecutionPath(graph) {
  if (!graph?.nodes?.length || !Array.isArray(graph.edges) || graph.nodes.some((node) => node.kind !== 'task') || graph.edges.some((edge) => edge.condition !== 'success')) return []
  const ids = new Set(graph.nodes.map((node) => node.id))
  if (ids.size !== graph.nodes.length || !ids.has(graph.startNodeId)) return []
  const next = new Map()
  const incoming = new Map()
  for (const edge of graph.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to) || next.has(edge.from) || incoming.has(edge.to)) return []
    next.set(edge.from, edge.to)
    incoming.set(edge.to, edge.from)
  }
  if (incoming.has(graph.startNodeId)) return []
  const path = []
  let cursor = graph.startNodeId
  while (cursor !== undefined && !path.includes(cursor)) {
    path.push(cursor)
    cursor = next.get(cursor)
  }
  return cursor === undefined && path.length === graph.nodes.length ? path : []
}

export function isLinearExecutionGraph(graph) {
  return linearExecutionPath(graph).length > 0
}

export function isActiveExecutionRun(run) {
  return ['ready', 'running', 'waiting', 'blocked'].includes(run?.status)
}

export function currentExecutionNode(plan, run) {
  return plan?.graph?.nodes.find((node) => node.id === run?.currentNodeId)
}

function nextEdge(plan, node, result) {
  const condition = result.status === 'failed' ? 'failure' : node.kind === 'decision' ? 'route' : 'success'
  return plan.graph.edges.find((edge) => edge.from === node.id && edge.condition === condition && (condition !== 'route' || edge.routeKey === result.routeKey))
}

/** Derived traversed path, including the current node but no unchosen branch. */
export function executionPath(plan, run) {
  if (!plan?.graph || !run) return []
  const path = []
  let id = plan.graph.startNodeId
  while (id && !path.includes(id)) {
    const node = plan.graph.nodes.find((entry) => entry.id === id)
    if (!node) break
    path.push(id)
    const result = run.nodeStates[id]
    if (id === run.currentNodeId || !['completed', 'failed'].includes(result?.status)) break
    id = nextEdge(plan, node, result)?.to
  }
  return path
}

export function executionProgress(plan, run) {
  const states = (plan?.graph?.nodes ?? []).map((node) => run?.nodeStates?.[node.id]?.status ?? 'pending')
  const count = (status) => states.filter((value) => value === status).length
  return {
    total: states.length, completed: count('completed'), failed: count('failed'), blocked: count('blocked'),
    pending: count('pending'), visited: states.length - count('pending'), currentNodeId: run?.currentNodeId, status: run?.status,
  }
}

function requirePlan(plan) {
  if (plan?.version !== 2 || typeof plan.generatedAt !== 'string' || !plan.generatedAt) fail('Execution Run requires a Final Plan v2', RUN_ERROR)
  validateExecutionGraph(plan.graph)
}

/** Normalize a persisted Run without changing its identity or silently resuming. */
export function normalizeExecutionRun(raw, plan, options = {}) {
  if (raw === undefined || raw === null) return undefined
  requirePlan(plan)
  if (raw.version !== 1 || !EXECUTION_RUN_STATUSES.includes(raw.status)) fail('invalid Execution Run version or status', RUN_ERROR)
  if (raw.planGeneratedAt !== plan.generatedAt) fail('Execution Run belongs to a different Plan', RUN_ERROR)
  validId(raw.id, 'run id', RUN_ERROR)
  if (!raw.nodeStates || typeof raw.nodeStates !== 'object' || Array.isArray(raw.nodeStates)) fail('Execution Run requires nodeStates', RUN_ERROR)
  const ids = new Set(plan.graph.nodes.map((node) => node.id))
  if (Object.keys(raw.nodeStates).some((id) => !ids.has(id))) fail('Execution Run references an unknown node', RUN_ERROR)
  const nodeStates = Object.fromEntries(plan.graph.nodes.map((node) => {
    const state = Object.hasOwn(raw.nodeStates, node.id) ? raw.nodeStates[node.id] : { status: 'pending', attempts: 0 }
    if (!state || !EXECUTION_NODE_STATUSES.includes(state.status) || !Number.isInteger(state.attempts) || state.attempts < 0) fail(`invalid state or attempts for ${node.id}`, RUN_ERROR)
    const result = { status: state.status, attempts: state.attempts }
    for (const [field, limit] of [['summary', 2000], ['startedAt', 100], ['completedAt', 100]]) {
      const value = text(state[field], limit, field, false, RUN_ERROR)
      if (value) result[field] = value
    }
    const routeKey = cleanRouteKey(state.routeKey, false, RUN_ERROR)
    if (routeKey) result.routeKey = routeKey
    for (const [field, limit] of [['outputRefs', 500], ['evidence', 1000]]) {
      const values = strings(state[field], field, limit, RUN_ERROR)
      if (values.length) result[field] = values
    }
    if (node.kind !== 'decision' && result.routeKey !== undefined) fail('only decision results may contain routeKey', RUN_ERROR)
    if (node.kind === 'decision' && result.status === 'completed' && !plan.graph.edges.some((edge) => edge.from === node.id && edge.condition === 'route' && edge.routeKey === result.routeKey)) fail('completed decision requires a matching routeKey', RUN_ERROR)
    if (node.kind === 'checkpoint' && ['ready', 'running', 'failed', 'blocked'].includes(result.status)) fail('checkpoint must wait for user approval', RUN_ERROR)
    if (node.kind !== 'checkpoint' && result.status === 'waiting') fail('only a checkpoint may be waiting', RUN_ERROR)
    return [node.id, result]
  }))
  const now = nowOf(options)
  const run = {
    version: 1, id: raw.id, planGeneratedAt: raw.planGeneratedAt, status: raw.status,
    ...(raw.currentNodeId === undefined ? {} : { currentNodeId: raw.currentNodeId }),
    nodeStates, startedAt: text(raw.startedAt, 100, 'startedAt', false, RUN_ERROR) || now,
    updatedAt: text(raw.updatedAt, 100, 'updatedAt', false, RUN_ERROR) || now,
    ...(raw.completedAt === undefined ? {} : { completedAt: text(raw.completedAt, 100, 'completedAt', true, RUN_ERROR) }),
  }
  if (run.currentNodeId !== undefined && !ids.has(run.currentNodeId)) fail('currentNodeId must reference a graph node', RUN_ERROR)
  if (isActiveExecutionRun(run)) {
    const expected = run.status === 'blocked' ? ['failed', 'blocked'] : [run.status]
    if (!run.currentNodeId || !expected.includes(nodeStates[run.currentNodeId].status)) fail('Run status must match its current node status', RUN_ERROR)
    if (run.completedAt !== undefined) fail('an active Run cannot have completedAt', RUN_ERROR)
    if (executionPath(plan, run).at(-1) !== run.currentNodeId) fail('currentNodeId must be on the reached execution path', RUN_ERROR)
  }
  if (run.status !== 'cancelled') {
    for (const [id, result] of Object.entries(nodeStates)) {
      if (id !== run.currentNodeId && ['ready', 'running', 'waiting', 'blocked'].includes(result.status)) fail('only the current node may be active', RUN_ERROR)
    }
  }
  if (run.status === 'completed') {
    const terminal = plan.graph.nodes.find((node) => node.id === executionPath(plan, run).at(-1))
    if (run.currentNodeId !== undefined || !terminal || nodeStates[terminal.id].status !== 'completed' || nextEdge(plan, terminal, nodeStates[terminal.id])) fail('completed Run must end at a completed terminal node', RUN_ERROR)
  }
  return run
}

/** Old manual done flags carry no implied Agent attempts. */
export function legacyExecutionRun(rawPlan, plan, options = {}) {
  if (!Array.isArray(rawPlan?.items) || !rawPlan.items.some((item) => item?.done === true)) return undefined
  requirePlan(plan)
  if (!isLinearExecutionGraph(plan.graph) || rawPlan.items.length !== plan.graph.nodes.length) fail('legacy Run requires its migrated linear Plan', RUN_ERROR)
  const now = plan.generatedAt || nowOf(options)
  let hash = 2166136261
  for (const char of `${plan.generatedAt}\0${plan.graph.nodes.map((node) => node.id).join('\0')}`) hash = Math.imul(hash ^ char.codePointAt(0), 16777619)
  const run = {
    version: 1, id: `legacy-${(hash >>> 0).toString(36)}`, planGeneratedAt: plan.generatedAt, status: 'ready',
    nodeStates: Object.fromEntries(plan.graph.nodes.map((node, index) => [node.id, rawPlan.items[index].done === true
      ? { status: 'completed', attempts: 0, summary: '从旧计划的完成标记迁移', completedAt: now }
      : { status: 'pending', attempts: 0 }])),
    startedAt: now, updatedAt: now,
  }
  enterNode(plan, run, plan.graph.startNodeId, now)
  return run
}

function enterNode(plan, run, nodeId, now) {
  let id = nodeId
  while (id !== undefined && run.nodeStates[id].status === 'completed') {
    const node = plan.graph.nodes.find((entry) => entry.id === id)
    id = nextEdge(plan, node, run.nodeStates[id])?.to
  }
  if (id === undefined) {
    run.status = 'completed'
    run.completedAt = now
    delete run.currentNodeId
    return
  }
  const node = plan.graph.nodes.find((entry) => entry.id === id)
  const status = node.kind === 'checkpoint' ? 'waiting' : 'ready'
  run.currentNodeId = id
  run.status = status
  run.nodeStates[id] = { ...run.nodeStates[id], status, ...(status === 'waiting' ? { startedAt: now } : {}) }
}

export function startExecutionRun(plan, existingRun, options = {}) {
  requirePlan(plan)
  if (isActiveExecutionRun(existingRun)) fail('an active Execution Run already exists', RUN_ERROR)
  const now = nowOf(options)
  const run = {
    version: 1, id: validId(options.id ?? `run-${randomUUID()}`, 'run id', RUN_ERROR), planGeneratedAt: plan.generatedAt,
    status: 'ready', nodeStates: Object.fromEntries(plan.graph.nodes.map((node) => [node.id, { status: 'pending', attempts: 0 }])),
    startedAt: now, updatedAt: now,
  }
  enterNode(plan, run, plan.graph.startNodeId, now)
  return run
}

function editableRun(plan, raw, nodeId, options) {
  const run = normalizeExecutionRun(raw, plan, options)
  if (!isActiveExecutionRun(run)) fail('an active Execution Run is required', RUN_ERROR)
  if (run.currentNodeId !== nodeId) fail('nodeId must equal currentNodeId', RUN_ERROR)
  run.updatedAt = nowOf(options)
  return run
}

export function beginExecutionNode(plan, raw, nodeId, options = {}) {
  const run = editableRun(plan, raw, nodeId, options)
  const node = currentExecutionNode(plan, run)
  if (node.kind === 'checkpoint') fail('checkpoint requires user approval', RUN_ERROR)
  const result = run.nodeStates[node.id]
  if (!['ready', 'failed', 'blocked'].includes(result.status)) fail('current node must be ready, failed, or blocked before begin', RUN_ERROR)
  run.nodeStates[node.id] = { status: 'running', attempts: result.attempts + 1, startedAt: run.updatedAt }
  run.status = 'running'
  return run
}

export function resetExecutionNode(plan, raw, nodeId, options = {}) {
  const run = editableRun(plan, raw, nodeId, options)
  const result = run.nodeStates[run.currentNodeId]
  if (result.status !== 'running') fail('only the current running node may be reset', RUN_ERROR)
  result.status = 'ready'
  const reason = text(options.reason, 2000, 'reset reason', false, RUN_ERROR)
  if (reason) result.summary = reason
  run.status = 'ready'
  return run
}

export function completeExecutionNode(plan, raw, args = {}, options = {}) {
  const run = editableRun(plan, raw, args.nodeId, options)
  if (args.runId !== run.id) fail('runId does not match the active Run', RUN_ERROR)
  if (args.nodeId !== run.currentNodeId) fail('nodeId must equal currentNodeId', RUN_ERROR)
  const node = currentExecutionNode(plan, run)
  if (node.kind === 'checkpoint') fail('Agent cannot complete a checkpoint; user approval is required', RUN_ERROR)
  if (run.nodeStates[node.id].status !== 'running') fail('current node must be running before completion', RUN_ERROR)
  if (!['completed', 'failed', 'blocked'].includes(args.outcome)) fail('invalid completion outcome', RUN_ERROR)
  if (args.routeKey !== undefined && (node.kind !== 'decision' || args.outcome !== 'completed')) fail('routeKey is allowed only for a completed decision', RUN_ERROR)
  const routeKey = cleanRouteKey(args.routeKey, node.kind === 'decision' && args.outcome === 'completed', RUN_ERROR)
  if (node.kind === 'decision' && args.outcome === 'completed' && !plan.graph.edges.some((edge) => edge.from === node.id && edge.condition === 'route' && edge.routeKey === routeKey)) fail('decision routeKey must match an allowed route', RUN_ERROR)
  const outputRefs = strings(args.outputRefs, 'outputRefs', 500, RUN_ERROR)
  const evidence = strings(args.evidence, 'evidence', 1000, RUN_ERROR)
  const result = {
    ...run.nodeStates[node.id], status: args.outcome,
    summary: text(args.summary, 2000, 'summary', true, RUN_ERROR), completedAt: run.updatedAt,
    ...(outputRefs.length ? { outputRefs } : {}), ...(evidence.length ? { evidence } : {}), ...(routeKey ? { routeKey } : {}),
  }
  run.nodeStates[node.id] = result
  const edge = nextEdge(plan, node, result)
  if (args.outcome === 'blocked' || (args.outcome === 'failed' && !edge)) run.status = 'blocked'
  else enterNode(plan, run, edge?.to, run.updatedAt)
  return run
}

export function approveExecutionCheckpoint(plan, raw, nodeId, options = {}) {
  const run = editableRun(plan, raw, nodeId, options)
  const node = currentExecutionNode(plan, run)
  if (node.kind !== 'checkpoint' || run.nodeStates[node.id].status !== 'waiting') fail('only the current waiting checkpoint may be approved', RUN_ERROR)
  const result = { ...run.nodeStates[node.id], status: 'completed', summary: '用户已批准', completedAt: run.updatedAt }
  run.nodeStates[node.id] = result
  enterNode(plan, run, nextEdge(plan, node, result)?.to, run.updatedAt)
  return run
}

export function retryExecutionNode(plan, raw, nodeId, options = {}) {
  const run = editableRun(plan, raw, nodeId, options)
  const result = run.nodeStates[run.currentNodeId]
  if (!['failed', 'blocked'].includes(result.status)) fail('only the current failed or blocked node may be retried', RUN_ERROR)
  result.status = 'ready'
  delete result.completedAt
  delete result.routeKey
  run.status = 'ready'
  return run
}

export function cancelExecutionRun(plan, raw, options = {}) {
  const run = editableRun(plan, raw, raw?.currentNodeId, options)
  run.status = 'cancelled'
  run.completedAt = run.updatedAt
  return run
}
