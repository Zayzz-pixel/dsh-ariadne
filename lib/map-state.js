/**
 * Pure Ariadne v2 state engine.
 *
 * Session events remain whole-value snapshots. This module normalizes legacy
 * v1 maps, derives tree facts, applies model operations, applies deterministic
 * UI operations, and validates the v2 invariants without importing DSH.
 */
import {
  normalizeFinalPlan, validateExecutionGraph, normalizeExecutionRun, legacyExecutionRun,
  startExecutionRun, beginExecutionNode, resetExecutionNode, completeExecutionNode,
  approveExecutionCheckpoint, retryExecutionNode, cancelExecutionRun, isActiveExecutionRun,
} from './execution-state.js'

export const STATUSES = ['unexplored', 'exploring', 'expanded', 'parked', 'selected']
export const SOURCES = ['user', 'agent']
export const LINK_KINDS = ['parent']
export const PHASES = ['exploring', 'executing']
export const DEFAULT_MAX_NODES = 200
export const MAX_NODE_NOTE_LENGTH = 3000
export const MAX_NODE_USER_NOTE_LENGTH = 3000

function fail(message) {
  const error = new Error(message)
  error.code = 'BRAINSTORM_MAP_ERROR'
  throw error
}

function timestamp(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function cleanTitle(value, field = 'title') {
  const title = String(value ?? '').trim().replace(/\s+/gu, ' ')
  if (title.length === 0) fail(`${field} must be a non-empty string`)
  if (title.length > 200) fail(`${field} must be at most 200 characters`)
  return title
}

function cleanOptionalText(value, maxLength) {
  if (value === undefined || value === null) return undefined
  const text = String(value).trim()
  return text.length === 0 ? undefined : text.slice(0, maxLength)
}

function cleanUserNote(value) {
  if (value === undefined || value === null) return undefined
  const text = String(value).replace(/\r\n?/gu, '\n')
  return text.trim().length === 0 ? undefined : text.slice(0, MAX_NODE_USER_NOTE_LENGTH)
}

export function normalizeFrame(rawFrame) {
  if (typeof rawFrame !== 'object' || rawFrame === null) return undefined
  const goal = cleanOptionalText(rawFrame.goal, 500)
  const organizingPrinciple = cleanOptionalText(rawFrame.organizingPrinciple, 500)
  if (goal === undefined && organizingPrinciple === undefined) return undefined
  return {
    goal: goal ?? '',
    organizingPrinciple: organizingPrinciple ?? '',
  }
}

function normalizeId(value, field = 'node id') {
  const id = String(value ?? '')
  if (id.length === 0 || id.length > 80) fail(`invalid ${field} ${JSON.stringify(id)}`)
  return id
}

export function normalizeTitle(value) {
  return cleanTitle(value).toLocaleLowerCase('en-US')
}

/** Deterministic id from parent identity plus normalized title. */
export function makeNodeId(title, parentId = null) {
  let hash = 2166136261
  const input = `${parentId === null ? 'root:' : `parent:${parentId}`}\0${normalizeTitle(title)}`
  for (const ch of input) {
    hash ^= ch.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return `n-${(hash >>> 0).toString(36)}`
}

export function emptyMap(topic, now = new Date().toISOString()) {
  return {
    version: 2,
    topic: cleanTitle(topic, 'topic'),
    phase: 'exploring',
    nodes: [],
    links: [],
    selectedIds: [],
    layout: { offsets: {}, sizes: {} },
    createdAt: now,
    updatedAt: now,
  }
}

function normalizeNode(raw, now) {
  if (typeof raw !== 'object' || raw === null) return null
  let id
  let title
  try {
    id = normalizeId(raw.id)
    title = cleanTitle(raw.title)
  } catch {
    return null
  }
  const status = STATUSES.includes(raw.status) ? raw.status : 'unexplored'
  const source = SOURCES.includes(raw.source) ? raw.source : 'agent'
  const note = cleanOptionalText(raw.note, MAX_NODE_NOTE_LENGTH)
  const userNote = cleanUserNote(raw.userNote)
  const userNoteUpdatedAt = userNote === undefined ? undefined : timestamp(raw.userNoteUpdatedAt, timestamp(raw.updatedAt, now))
  return {
    id,
    title,
    status,
    source,
    createdAt: timestamp(raw.createdAt, now),
    updatedAt: timestamp(raw.updatedAt, now),
    ...(note === undefined ? {} : { note }),
    ...(userNote === undefined ? {} : { userNote }),
    ...(userNoteUpdatedAt === undefined ? {} : { userNoteUpdatedAt }),
  }
}

function wouldCycle(from, to, parentById) {
  let cursor = from
  const seen = new Set()
  while (cursor !== undefined && !seen.has(cursor)) {
    if (cursor === to) return true
    seen.add(cursor)
    cursor = parentById.get(cursor)
  }
  return false
}

function normalizeLinks(rawLinks, nodeIds) {
  const links = []
  const parentById = new Map()
  const keys = new Set()
  for (const raw of Array.isArray(rawLinks) ? rawLinks : []) {
    if (typeof raw !== 'object' || raw === null || raw.kind !== 'parent') continue
    const from = String(raw.from ?? '')
    const to = String(raw.to ?? '')
    if (from === to || !nodeIds.has(from) || !nodeIds.has(to) || parentById.has(to)) continue
    if (wouldCycle(from, to, parentById)) continue
    const key = `${from}->${to}`
    if (keys.has(key)) continue
    const label = cleanOptionalText(raw.label, 120)
    links.push({ from, to, kind: 'parent', ...(label === undefined ? {} : { label }) })
    parentById.set(to, from)
    keys.add(key)
  }
  return links
}

function normalizeLayout(rawLayout, nodeIds) {
  const offsets = {}
  for (const [id, value] of Object.entries(rawLayout?.offsets ?? {})) {
    if (!nodeIds.has(id)) continue
    if (Number.isFinite(value?.dx) && Number.isFinite(value?.dy)) offsets[id] = { dx: value.dx, dy: value.dy }
  }
  const sizes = {}
  for (const [id, value] of Object.entries(rawLayout?.sizes ?? {})) {
    if (!nodeIds.has(id)) continue
    if (Number.isFinite(value?.w) && value.w > 0 && Number.isFinite(value?.h) && value.h > 0) {
      sizes[id] = { w: value.w, h: value.h }
    }
  }
  return { offsets, sizes }
}

function normalizePlanForMap(rawPlan, selectedIds, sourceNodes, now) {
  if (!rawPlan) return undefined
  try {
    return normalizeFinalPlan(rawPlan, { selectedIds, sourceNodes, now })
  } catch (error) {
    // Retain the existing fallback for invalid legacy plans; V2 graph errors stay visible.
    if (rawPlan.version === 2) throw error
    return undefined
  }
}

/** Convert any persisted v1/v2 value into the current in-memory v2 shape. */
export function normalizeMap(raw, options = {}) {
  if (typeof raw !== 'object' || raw === null) fail('map must be an object')
  const now = options.now ?? new Date().toISOString()
  const topic = cleanTitle(raw.topic, 'topic')
  const nodeById = new Map()
  for (const value of Array.isArray(raw.nodes) ? raw.nodes : []) {
    const node = normalizeNode(value, now)
    if (node !== null && !nodeById.has(node.id)) nodeById.set(node.id, node)
  }
  const nodes = [...nodeById.values()]
  const nodeIds = new Set(nodeById.keys())
  const links = normalizeLinks(raw.links, nodeIds)
  const selectedIds = []
  for (const value of Array.isArray(raw.selectedIds) ? raw.selectedIds : []) {
    const id = String(value)
    if (nodeIds.has(id) && !selectedIds.includes(id)) selectedIds.push(id)
  }
  let phase = raw.phase === 'executing' ? 'executing' : 'exploring'
  const finalPlan = phase === 'executing' ? normalizePlanForMap(raw.finalPlan, selectedIds, nodes, now) : undefined
  if (finalPlan === undefined) phase = 'exploring'
  const executionRun = finalPlan
    ? raw.executionRun
      ? normalizeExecutionRun(raw.executionRun, finalPlan, { now })
      : legacyExecutionRun(raw.finalPlan, finalPlan, { now })
    : undefined
  const selected = new Set(selectedIds)
  const normalizedNodes = nodes.map((node) => {
    if (phase === 'executing') return { ...node, status: selected.has(node.id) ? 'selected' : node.status === 'selected' ? 'expanded' : node.status }
    return node.status === 'selected' ? { ...node, status: 'expanded' } : node
  })
  const projectId = cleanOptionalText(raw.projectId, 120)
  const frame = normalizeFrame(raw.frame)
  const map = {
    version: 2,
    ...(projectId === undefined ? {} : { projectId }),
    ...(frame === undefined ? {} : { frame }),
    topic,
    phase,
    nodes: normalizedNodes,
    links,
    selectedIds,
    ...(finalPlan === undefined ? {} : { finalPlan }),
    ...(executionRun === undefined ? {} : { executionRun }),
    layout: normalizeLayout(raw.layout, nodeIds),
    createdAt: timestamp(raw.createdAt, now),
    updatedAt: timestamp(raw.updatedAt, now),
  }
  validateMap(map, options)
  return map
}

export function treeFacts(map) {
  const byId = new Map(map.nodes.map((node) => [node.id, node]))
  const parentById = new Map()
  const childrenById = new Map(map.nodes.map((node) => [node.id, []]))
  for (const link of map.links) {
    parentById.set(link.to, link.from)
    childrenById.get(link.from)?.push(link.to)
  }
  const roots = map.nodes.filter((node) => !parentById.has(node.id)).map((node) => node.id)
  const depthById = new Map()
  const ancestorsById = new Map()
  const descendantsById = new Map()
  const visit = (id, depth, ancestors) => {
    depthById.set(id, depth)
    ancestorsById.set(id, ancestors)
    for (const child of childrenById.get(id) ?? []) visit(child, depth + 1, [...ancestors, id])
  }
  roots.forEach((id) => visit(id, 1, []))
  const descendants = (id) => {
    const result = []
    for (const child of childrenById.get(id) ?? []) {
      result.push(child, ...descendants(child))
    }
    descendantsById.set(id, result)
    return result
  }
  roots.forEach(descendants)
  return { byId, roots, parentById, childrenById, depthById, ancestorsById, descendantsById }
}

export function validateMap(map, options = {}) {
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES
  if (map.version !== 2) fail(`map version must be 2, got ${JSON.stringify(map.version)}`)
  cleanTitle(map.topic, 'topic')
  if (map.frame !== undefined) {
    const frame = normalizeFrame(map.frame)
    if (frame === undefined) fail('frame must contain a goal or organizingPrinciple')
    if (frame.goal !== map.frame.goal || frame.organizingPrinciple !== map.frame.organizingPrinciple) fail('frame must be normalized')
  }
  if (!PHASES.includes(map.phase)) fail(`unknown phase ${JSON.stringify(map.phase)}`)
  if (map.nodes.length > maxNodes) fail(`map would exceed the ${maxNodes}-node limit (${map.nodes.length})`)
  const ids = new Set()
  for (const node of map.nodes) {
    if (ids.has(node.id)) fail(`duplicate node id ${node.id}`)
    ids.add(normalizeId(node.id))
    cleanTitle(node.title)
    if (!STATUSES.includes(node.status)) fail(`unknown node status ${JSON.stringify(node.status)}`)
    if (!SOURCES.includes(node.source)) fail(`unknown node source ${JSON.stringify(node.source)}`)
    if ('depth' in node) fail(`node ${node.id} must not persist depth`)
  }
  const parentById = new Map()
  for (const link of map.links) {
    if (link.kind !== 'parent') fail(`unknown link kind ${JSON.stringify(link.kind)}`)
    if (!ids.has(link.from) || !ids.has(link.to)) fail(`link references unknown node ${link.from}->${link.to}`)
    if (link.from === link.to) fail(`link cannot connect a node to itself: ${link.from}`)
    if (parentById.has(link.to)) fail(`node ${link.to} has more than one parent link`)
    if (wouldCycle(link.from, link.to, parentById)) fail('parent links must not form a cycle')
    parentById.set(link.to, link.from)
  }
  for (const id of map.selectedIds) if (!ids.has(id)) fail(`selectedIds references unknown node ${id}`)
  for (const id of Object.keys(map.layout.offsets)) if (!ids.has(id)) fail(`layout offset references unknown node ${id}`)
  for (const id of Object.keys(map.layout.sizes)) if (!ids.has(id)) fail(`layout size references unknown node ${id}`)
  if (map.phase === 'exploring') {
    if (map.finalPlan !== undefined) fail('exploring map must not carry a Final Plan')
    if (map.executionRun !== undefined) fail('exploring map must not carry an Execution Run')
    if (map.nodes.some((node) => node.status === 'selected')) fail('selected status requires a Final Plan')
  } else {
    if (map.finalPlan?.version !== 2) fail('executing phase requires a Final Plan v2')
    const selected = new Set(map.selectedIds)
    for (const node of map.nodes) {
      if ((node.status === 'selected') !== selected.has(node.id)) fail('executing selected statuses must match selectedIds')
    }
    validateExecutionGraph(map.finalPlan.graph, { selectedIds: map.selectedIds, sourceNodes: map.nodes, uncovered: map.finalPlan.uncovered })
    if (map.executionRun !== undefined) normalizeExecutionRun(map.executionRun, map.finalPlan, options)
  }
  return map
}

/** Latest normalized Ariadne snapshot in a Session log. */
export function latestMap(events, options = {}) {
  let raw = null
  for (const event of events) if (event?.type === 'brainstorm/map' && event.data?.map) raw = event.data.map
  return raw === null ? null : normalizeMap(raw, options)
}

function cloneMap(map, now) {
  return {
    ...map,
    ...(map.frame === undefined ? {} : { frame: { ...map.frame } }),
    nodes: map.nodes.map((node) => ({ ...node })),
    links: map.links.map((link) => ({ ...link })),
    selectedIds: [...map.selectedIds],
    ...(map.finalPlan === undefined ? {} : { finalPlan: structuredClone(map.finalPlan) }),
    ...(map.executionRun === undefined ? {} : { executionRun: structuredClone(map.executionRun) }),
    layout: {
      offsets: { ...map.layout.offsets },
      sizes: { ...map.layout.sizes },
    },
    updatedAt: now,
  }
}

function addParentLink(map, from, to, label) {
  if (from === to) fail(`link cannot connect a node to itself: ${from}`)
  const ids = new Set(map.nodes.map((node) => node.id))
  if (!ids.has(from)) fail(`link.from references unknown node ${JSON.stringify(from)}`)
  if (!ids.has(to)) fail(`link.to references unknown node ${JSON.stringify(to)}`)
  const same = map.links.find((link) => link.from === from && link.to === to)
  if (same) {
    same.label = label
    if (label === undefined) delete same.label
    return false
  }
  const parentById = new Map(map.links.map((link) => [link.to, link.from]))
  if (parentById.has(to)) fail(`node ${to} has more than one parent link`)
  if (wouldCycle(from, to, parentById)) fail('parent links must not form a cycle')
  map.links.push({ from, to, kind: 'parent', ...(label === undefined ? {} : { label }) })
  return true
}

/** Apply one model-supplied incremental batch and return a complete v2 map. */
export function applyOps(prev, ops = {}, options = {}) {
  const now = options.now ?? new Date().toISOString()
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES
  let base
  if (prev === null || prev === undefined) {
    if (!ops.topic) fail('first brainstorm_map call must provide a non-empty `topic`')
    base = emptyMap(ops.topic, now)
  } else {
    base = normalizeMap(prev, { ...options, now })
  }
  if (base.phase === 'executing' && ops.phase !== 'exploring') {
    fail('brainstorm_map cannot change an executing map; return to exploring first')
  }
  let next = ops.phase === 'exploring' ? returnToExploring(base, { ...options, now }) : cloneMap(base, now)
  const changes = { nodesAdded: 0, nodesUpdated: 0, nodesRemoved: 0, linksAdded: 0, linksRemoved: 0 }

  if (ops.topic !== undefined) next.topic = cleanTitle(ops.topic, 'topic')
  if (ops.projectId !== undefined) {
    const projectId = cleanOptionalText(ops.projectId, 120)
    if (projectId === undefined) delete next.projectId
    else next.projectId = projectId
  }
  if (ops.frame !== undefined) {
    const frame = normalizeFrame(ops.frame)
    if (frame === undefined) delete next.frame
    else next.frame = frame
  }
  if (ops.layout !== undefined) next.layout = normalizeLayout(ops.layout, new Set(next.nodes.map((node) => node.id)))

  for (const value of ops.removeNodeIds ?? []) {
    const id = String(value)
    const target = next.nodes.find((node) => node.id === id)
    if (target?.userNote) fail(`clear the personal note before removing node ${JSON.stringify(id)}`)
    const before = next.nodes.length
    next.nodes = next.nodes.filter((node) => node.id !== id)
    if (next.nodes.length === before) continue
    changes.nodesRemoved += 1
    next.links = next.links.filter((link) => link.from !== id && link.to !== id)
    next.selectedIds = next.selectedIds.filter((selected) => selected !== id)
    delete next.layout.offsets[id]
    delete next.layout.sizes[id]
  }

  for (const raw of ops.upsertNodes ?? []) {
    if (typeof raw !== 'object' || raw === null) fail('upsertNodes entries must be objects')
    const requestedTitle = raw.title === undefined ? undefined : cleanTitle(raw.title)
    const parentId = raw.parentId === undefined || raw.parentId === null ? null : normalizeId(raw.parentId, 'parent id')
    const facts = treeFacts(next)
    let id
    if (raw.id !== undefined) id = normalizeId(raw.id)
    else {
      if (requestedTitle === undefined) fail('new id-less node requires a title')
      const match = next.nodes.find((node) => {
        const existingParent = facts.parentById.get(node.id) ?? null
        return existingParent === parentId && normalizeTitle(node.title) === normalizeTitle(requestedTitle)
      })
      id = match?.id ?? makeNodeId(requestedTitle, parentId)
    }
    const index = next.nodes.findIndex((node) => node.id === id)
    const existing = index === -1 ? undefined : next.nodes[index]
    const title = requestedTitle ?? existing?.title
    if (title === undefined) fail(`node ${id} requires a non-empty title`)
    const status = raw.status ?? existing?.status ?? 'unexplored'
    if (!STATUSES.includes(status)) fail(`unknown node status ${JSON.stringify(status)}`)
    if (status === 'selected') fail('selected status can only be written by Final Plan')
    const source = raw.source ?? existing?.source ?? 'agent'
    if (!SOURCES.includes(source)) fail(`unknown node source ${JSON.stringify(source)}`)
    const note = raw.note === undefined ? existing?.note : cleanOptionalText(raw.note, MAX_NODE_NOTE_LENGTH)
    const userNote = existing?.userNote
    const userNoteUpdatedAt = existing?.userNoteUpdatedAt
    const node = {
      id,
      title,
      status,
      source,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...(note === undefined ? {} : { note }),
      ...(userNote === undefined ? {} : { userNote }),
      ...(userNoteUpdatedAt === undefined ? {} : { userNoteUpdatedAt }),
    }
    if (existing === undefined) {
      next.nodes.push(node)
      changes.nodesAdded += 1
    } else {
      next.nodes[index] = node
      changes.nodesUpdated += 1
    }
    if (parentId !== null) {
      if (existing !== undefined) next.links = next.links.filter((link) => link.to !== id || link.from === parentId)
      if (addParentLink(next, parentId, id)) changes.linksAdded += 1
    }
  }

  if (next.nodes.length > maxNodes) fail(`map would exceed the ${maxNodes}-node limit (${next.nodes.length})`)

  if (Array.isArray(ops.removeLinks)) {
    const removed = new Set(ops.removeLinks.map((link) => `${String(link.from)}->${String(link.to)}`))
    const before = next.links.length
    next.links = next.links.filter((link) => !removed.has(`${link.from}->${link.to}`))
    changes.linksRemoved += before - next.links.length
  }
  for (const raw of ops.upsertLinks ?? []) {
    if (typeof raw !== 'object' || raw === null) fail('upsertLinks entries must be objects')
    if (raw.kind !== undefined && raw.kind !== 'parent') fail(`unknown link kind ${JSON.stringify(raw.kind)}`)
    const label = cleanOptionalText(raw.label, 120)
    if (addParentLink(next, String(raw.from), String(raw.to), label)) changes.linksAdded += 1
  }

  if (ops.selectedIds !== undefined) {
    const ids = new Set(next.nodes.map((node) => node.id))
    next.selectedIds = []
    for (const value of ops.selectedIds) {
      const id = String(value)
      if (ids.has(id) && !next.selectedIds.includes(id)) next.selectedIds.push(id)
    }
  }

  next.version = 2
  next.updatedAt = now
  validateMap(next, { ...options, maxNodes })
  return { map: next, changes }
}

export function applyFinalPlan(prev, args, options = {}) {
  const now = options.now ?? new Date().toISOString()
  const map = cloneMap(normalizeMap(prev, { ...options, now }), now)
  if (map.selectedIds.length === 0) fail('Final Plan requires at least one selected node')
  if (!args?.graph) fail('Final Plan requires an execution graph')
  if (isActiveExecutionRun(map.executionRun)) fail('cancel the active Execution Run before regenerating the plan')
  const selected = new Set(map.selectedIds)
  map.finalPlan = normalizeFinalPlan({ version: 2, graph: args.graph, uncovered: args.uncovered ?? [], generatedAt: now }, { selectedIds: map.selectedIds, sourceNodes: map.nodes, now })
  map.phase = 'executing'
  map.nodes = map.nodes.map((node) => ({ ...node, status: selected.has(node.id) ? 'selected' : node.status === 'selected' ? 'expanded' : node.status }))
  delete map.executionRun
  map.updatedAt = now
  validateMap(map, options)
  return map
}

export function applyExecutionResult(prev, args, options = {}) {
  const now = options.now ?? new Date().toISOString()
  const map = cloneMap(normalizeMap(prev, { ...options, now }), now)
  if (map.phase !== 'executing' || !map.finalPlan) fail('execution completion requires a Final Plan')
  map.executionRun = completeExecutionNode(map.finalPlan, map.executionRun, args, { ...options, now })
  validateMap(map, options)
  return map
}

export function returnToExploring(prev, options = {}) {
  const now = options.now ?? new Date().toISOString()
  const map = cloneMap(normalizeMap(prev, { ...options, now }), now)
  map.phase = 'exploring'
  map.nodes = map.nodes.map((node) => node.status === 'selected' ? { ...node, status: 'expanded', updatedAt: now } : node)
  delete map.finalPlan
  delete map.executionRun
  map.updatedAt = now
  validateMap(map, options)
  return map
}

function requireNode(map, nodeId) {
  const node = map.nodes.find((candidate) => candidate.id === nodeId)
  if (node === undefined) fail(`unknown node ${JSON.stringify(nodeId)}`)
  return node
}

function requireExecutionPlan(map) {
  if (map.phase !== 'executing' || map.finalPlan?.version !== 2) fail('execution operation requires a Final Plan v2')
  return map.finalPlan
}

function editableExecutionNode(map, nodeId) {
  const plan = requireExecutionPlan(map)
  if (map.executionRun) fail('Execution Run has started; regenerate the plan before editing its specification')
  const node = plan.graph.nodes.find((candidate) => candidate.id === nodeId)
  if (!node) fail(`unknown execution node ${JSON.stringify(nodeId)}`)
  return node
}

/** Apply deterministic UI operations; returns the complete next map. */
export function applyDirectOps(prev, operations, options = {}) {
  const now = options.now ?? new Date().toISOString()
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES
  let map = cloneMap(normalizeMap(prev, { ...options, now }), now)
  const list = Array.isArray(operations) ? operations : [operations]
  for (const op of list) {
    if (typeof op !== 'object' || op === null) fail('Direct Ops entries must be objects')
    switch (op.type) {
      case 'set-topic':
        map.topic = cleanTitle(op.topic, 'topic')
        break
      case 'set-frame': {
        const frame = normalizeFrame(op)
        if (frame === undefined) delete map.frame
        else map.frame = frame
        break
      }
      case 'set-title': {
        const node = requireNode(map, String(op.nodeId))
        node.title = cleanTitle(op.title)
        node.updatedAt = now
        break
      }
      case 'set-note': {
        const node = requireNode(map, String(op.nodeId))
        const note = cleanOptionalText(op.note, MAX_NODE_NOTE_LENGTH)
        if (note === undefined) delete node.note
        else node.note = note
        node.updatedAt = now
        break
      }
      case 'set-user-note': {
        const node = requireNode(map, String(op.nodeId))
        const userNote = cleanUserNote(op.userNote)
        if (userNote === undefined) {
          delete node.userNote
          delete node.userNoteUpdatedAt
        } else {
          node.userNote = userNote
          node.userNoteUpdatedAt = now
        }
        node.updatedAt = now
        break
      }
      case 'set-status': {
        const node = requireNode(map, String(op.nodeId))
        if (!STATUSES.includes(op.status)) fail(`unknown node status ${JSON.stringify(op.status)}`)
        if (op.status === 'selected') fail('set-status cannot write selected')
        if (map.phase === 'executing') fail('return to exploring before changing node status')
        node.status = op.status
        node.updatedAt = now
        break
      }
      case 'toggle-selection': {
        if (map.phase === 'executing') fail('return to exploring before changing the selection pool')
        const nodeId = String(op.nodeId)
        requireNode(map, nodeId)
        map.selectedIds = op.selected === false
          ? map.selectedIds.filter((id) => id !== nodeId)
          : [...map.selectedIds.filter((id) => id !== nodeId), nodeId]
        break
      }
      case 'create-child': {
        if (map.phase === 'executing') fail('return to exploring before creating a child node')
        const parentId = op.parentId === undefined || op.parentId === null ? null : String(op.parentId)
        if (parentId !== null) requireNode(map, parentId)
        const title = cleanTitle(op.title)
        const id = makeNodeId(title, parentId)
        const note = cleanOptionalText(op.note, MAX_NODE_NOTE_LENGTH)
        const existing = map.nodes.find((node) => node.id === id)
        if (existing) {
          existing.title = title
          if (note !== undefined) existing.note = note
          existing.updatedAt = now
        } else {
          map.nodes.push({
            id,
            title,
            status: 'unexplored',
            source: 'user',
            createdAt: now,
            updatedAt: now,
            ...(note === undefined ? {} : { note }),
          })
        }
        if (parentId !== null) addParentLink(map, parentId, id)
        if (map.nodes.length > maxNodes) fail(`map would exceed the ${maxNodes}-node limit (${map.nodes.length})`)
        break
      }
      case 'set-offset': {
        const nodeId = String(op.nodeId)
        requireNode(map, nodeId)
        if (!Number.isFinite(op.dx) || !Number.isFinite(op.dy)) fail('offset values must be finite numbers')
        map.layout.offsets[nodeId] = { dx: op.dx, dy: op.dy }
        break
      }
      case 'set-size': {
        const nodeId = String(op.nodeId)
        requireNode(map, nodeId)
        if (!Number.isFinite(op.w) || op.w <= 0 || !Number.isFinite(op.h) || op.h <= 0) fail('size values must be positive finite numbers')
        map.layout.sizes[nodeId] = { w: op.w, h: op.h }
        break
      }
      case 'reset-layout': {
        const ids = op.nodeIds === undefined ? map.nodes.map((node) => node.id) : op.nodeIds.map(String)
        ids.forEach((id) => {
          delete map.layout.offsets[id]
          delete map.layout.sizes[id]
        })
        break
      }
      case 'set-execution-node-title':
        editableExecutionNode(map, op.nodeId).title = cleanTitle(op.title, 'execution title')
        break
      case 'set-execution-node-instruction':
        editableExecutionNode(map, op.nodeId).instruction = op.instruction
        break
      case 'set-execution-node-criteria':
        editableExecutionNode(map, op.nodeId).completionCriteria = op.completionCriteria
        break
      case 'set-execution-node-inputs':
        editableExecutionNode(map, op.nodeId).requiredInputs = op.requiredInputs
        break
      case 'set-execution-node-outputs':
        editableExecutionNode(map, op.nodeId).expectedOutputs = op.expectedOutputs
        break
      case 'start-execution-run':
        map.executionRun = startExecutionRun(requireExecutionPlan(map), map.executionRun, { ...options, now })
        break
      case 'begin-execution-node':
        map.executionRun = beginExecutionNode(requireExecutionPlan(map), map.executionRun, op.nodeId, { now })
        break
      case 'reset-execution-node':
        map.executionRun = resetExecutionNode(requireExecutionPlan(map), map.executionRun, op.nodeId, { now, reason: op.reason })
        break
      case 'approve-execution-checkpoint':
        map.executionRun = approveExecutionCheckpoint(requireExecutionPlan(map), map.executionRun, op.nodeId, { now })
        break
      case 'retry-execution-node':
        map.executionRun = retryExecutionNode(requireExecutionPlan(map), map.executionRun, op.nodeId, { now })
        break
      case 'cancel-execution-run':
        map.executionRun = cancelExecutionRun(requireExecutionPlan(map), map.executionRun, { now })
        break
      case 'return-to-exploring':
        map = returnToExploring(map, { ...options, now })
        break
      default:
        fail(`unknown Direct Op ${JSON.stringify(op.type)}`)
    }
  }
  if (map.finalPlan) map.finalPlan = normalizeFinalPlan(map.finalPlan, { selectedIds: map.selectedIds, sourceNodes: map.nodes, now })
  map.updatedAt = now
  validateMap(map, { ...options, maxNodes })
  return map
}

export function outlineMap(map, limit = 200) {
  const normalized = normalizeMap(map)
  const facts = treeFacts(normalized)
  const sorted = [...normalized.nodes].sort((a, b) => {
    const depth = (facts.depthById.get(a.id) ?? 1) - (facts.depthById.get(b.id) ?? 1)
    return depth || a.createdAt.localeCompare(b.createdAt)
  })
  const lines = [`# ${normalized.topic} [phase: ${normalized.phase}]`]
  for (const node of sorted) {
    const depth = facts.depthById.get(node.id) ?? 1
    lines.push(`- [${node.status}] d${depth} ${node.title}${node.note ? ` — ${node.note}` : ''}`)
    if (lines.length >= limit) {
      lines.push(`… ${sorted.length - (lines.length - 2)} more nodes omitted`)
      break
    }
  }
  return lines.join('\n')
}

export function mapStats(map) {
  if (!map) return null
  const normalized = normalizeMap(map)
  const facts = treeFacts(normalized)
  const statuses = { unexplored: 0, exploring: 0, expanded: 0, parked: 0, selected: 0 }
  for (const node of normalized.nodes) statuses[node.status] += 1
  return {
    nodeCount: normalized.nodes.length,
    depthMax: Math.max(0, ...facts.depthById.values()),
    linkCount: normalized.links.length,
    statuses,
  }
}

export function buildProjectMap(entries, workspaceId, now = new Date().toISOString()) {
  const sessions = []
  for (const entry of entries) {
    if (!entry.map) continue
    const map = normalizeMap(entry.map, { now })
    sessions.push({ sessionId: entry.sessionId, map, stats: mapStats(map) })
  }
  const totals = { sessions: sessions.length, nodes: 0, links: 0, unexplored: 0 }
  for (const session of sessions) {
    totals.nodes += session.stats.nodeCount
    totals.links += session.stats.linkCount
    totals.unexplored += session.stats.statuses.unexplored
  }
  return { version: 1, workspaceId, generatedAt: now, sessions, totals }
}
