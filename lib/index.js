/**
 * dsh-ariadne — DSH host half.
 *
 * The host owns v2 normalization, model tools, deterministic Direct Ops,
 * whole-value Session events, and the two browser projections.
 */
import { z } from 'zod'
import zSchemastery from '@deepseek-ai/schemastery'
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  STATUSES,
  SOURCES,
  DEFAULT_MAX_NODES,
  latestMap,
  normalizeMap,
  validateMap,
  applyOps,
  applyDirectOps as applyMapDirectOps,
  applyFinalPlan,
  applyExecutionResult,
  outlineMap,
} from './map-state.js'
import { buildProjectOverview, createProject, normalizeProject as normalizeProjectRecord, updateProject } from './project-state.js'
import { inspectWorkspaceMaps } from './session-maps.js'
import { jsonCanvasText, mapMarkdown, toExecutionJson, toExecutionMarkdown } from './export.js'
import { isActiveExecutionRun } from './execution-state.js'

export const name = 'dsh-ariadne'
export const inject = ['tools', 'sessions', 'settings', 'agents', 'webServer', 'systemPrompt', 'storageDomain', 'sessionPersistence']
export const SETTINGS_NAMESPACE = 'brainstorm-map'
export const BRAINSTORM_TOOL_NAMES = ['brainstorm_map', 'brainstorm_project', 'brainstorm_plan', 'brainstorm_execution_complete']
export const BRAINSTORM_EVENT_TYPES = ['brainstorm/map', 'brainstorm/project']

/**
 * rc.7 exposes its persistence vocabulary as one process-wide Set. Downstream
 * event registration has no dedicated service yet, so the plugin registers its
 * required log-only events before any Session resume occurs.
 */
export function registerBrainstormEventTypes() {
  for (const type of BRAINSTORM_EVENT_TYPES) KNOWN_SESSION_EVENT_TYPES.add(type)
}

registerBrainstormEventTypes()

const EDITABLE_STATUSES = STATUSES.filter((status) => status !== 'selected')

const mapNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(STATUSES),
  source: z.enum(SOURCES),
  note: z.string().max(3000).optional(),
  userNote: z.string().max(3000).optional(),
  userNoteUpdatedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const executionNodeSchema = z.object({
  id: z.string(),
  kind: z.enum(['task', 'decision', 'checkpoint']),
  sourceNodeIds: z.array(z.string()),
  title: z.string(),
  instruction: z.string(),
  requiredInputs: z.array(z.string()).optional(),
  expectedOutputs: z.array(z.string()).optional(),
  completionCriteria: z.array(z.string()),
})

const finalPlanGapSchema = z.object({
  id: z.string(),
  title: z.string(),
  reason: z.string().max(1000).optional(),
  sourceNodeIds: z.array(z.string()).optional(),
})

const finalPlanSchema = z.object({
  version: z.literal(2),
  graph: z.object({
    startNodeId: z.string(),
    nodes: z.array(executionNodeSchema),
    edges: z.array(z.object({
      id: z.string(), from: z.string(), to: z.string(),
      condition: z.enum(['success', 'failure', 'route']),
      routeKey: z.string().optional(), label: z.string().optional(),
    })),
  }),
  uncovered: z.array(finalPlanGapSchema),
  generatedAt: z.string(),
})

const executionRunSchema = z.object({
  version: z.literal(1), id: z.string(), planGeneratedAt: z.string(),
  status: z.enum(['ready', 'running', 'waiting', 'blocked', 'completed', 'cancelled']),
  currentNodeId: z.string().optional(),
  nodeStates: z.record(z.object({
    status: z.enum(['pending', 'ready', 'running', 'waiting', 'completed', 'failed', 'blocked']),
    attempts: z.number().int(), summary: z.string().optional(),
    outputRefs: z.array(z.string()).optional(), evidence: z.array(z.string()).optional(),
    routeKey: z.string().optional(), startedAt: z.string().optional(), completedAt: z.string().optional(),
  })),
  startedAt: z.string(), updatedAt: z.string(), completedAt: z.string().optional(),
})

const frameSchema = z.object({
  goal: z.string().max(500),
  organizingPrinciple: z.string().max(500),
})

const mapSchema = z.object({
  version: z.literal(2),
  projectId: z.string().optional(),
  frame: frameSchema.optional(),
  topic: z.string().min(1).max(200),
  phase: z.enum(['exploring', 'executing']),
  nodes: z.array(mapNodeSchema),
  links: z.array(z.object({
    from: z.string(),
    to: z.string(),
    kind: z.literal('parent'),
    label: z.string().max(120).optional(),
  })),
  selectedIds: z.array(z.string()),
  finalPlan: finalPlanSchema.optional(),
  executionRun: executionRunSchema.optional(),
  layout: z.object({
    offsets: z.record(z.object({ dx: z.number(), dy: z.number() })),
    sizes: z.record(z.object({ w: z.number(), h: z.number() })),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const projectionSchema = z.union([mapSchema, z.null()])

const projectRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  goal: z.string().optional(),
  cwd: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const projectNodeRefSchema = z.object({ id: z.string(), title: z.string() })
const projectSchema = z.object({
  version: z.literal(2),
  project: projectRecordSchema,
  generatedAt: z.string(),
  sessions: z.array(z.object({
    sessionId: z.string(),
    title: z.string(),
    map: mapSchema,
    stats: z.object({
      nodeCount: z.number().int(),
      depthMax: z.number().int(),
      linkCount: z.number().int(),
      rootCount: z.number().int(),
      selectedCount: z.number().int(),
      statuses: z.object({
        unexplored: z.number().int(),
        exploring: z.number().int(),
        expanded: z.number().int(),
        parked: z.number().int(),
        selected: z.number().int(),
      }),
    }),
    roots: z.array(z.object({ id: z.string(), title: z.string(), note: z.string().optional(), nodeCount: z.number().int() })),
    selected: z.array(projectNodeRefSchema),
    unexplored: z.array(projectNodeRefSchema),
    updatedAt: z.string(),
  })),
  related: z.array(z.object({
    sessionId: z.string(),
    title: z.string(),
    topic: z.string(),
    projectId: z.string().optional(),
    reason: z.string(),
  })),
  totals: z.object({
    sessions: z.number().int(),
    nodes: z.number().int(),
    roots: z.number().int(),
    links: z.number().int(),
    unexplored: z.number().int(),
    selected: z.number().int(),
  }),
})

const projectProjectionSchema = z.union([projectSchema, z.null()])

function normalizeProject(raw) {
  if (!raw || !Array.isArray(raw.sessions)) return null
  try {
    const project = { ...raw, sessions: raw.sessions.map((entry) => ({ ...entry, map: normalizeMap(entry.map) })) }
    return projectSchema.safeParse(project).success ? project : null
  } catch {
    return null
  }
}

export const brainstormProjectDomainSpec = defineDomain({
  name: 'brainstorm_projects',
  version: 1,
  tables: { projects: domainTable(projectRecordSchema) },
})

const TOOL_DESCRIPTION = [
  'Maintain the Ariadne map for the current conversation.',
  'Send only operations that changed; the host writes the complete v2 snapshot.',
  '`topic` is the Session starting point and is required on the first call.',
  'Use `frame` to record the current Session goal and its main organizing principle; a first map built from one new idea should include both `topic` and `frame`.',
  'Classify every idea as either a deeper child of an existing branch or a new root.',
  'Use `parentId` on id-less child upserts. Root nodes omit `parentId`.',
  'Only parent links are supported. Depth is derived from the tree and must not be supplied.',
  'Proactively add at most 3 genuinely novel missing directions per call, without padding.',
  'When the user explicitly requests a small exploration, add at most 5 direct children and do not recurse.',
  'Do not call this tool for ordinary chat, repeated explanations, wording-only edits, or mechanical UI operations.',
  'Never delete user directions, cancel selectedIds, or discard existing notes during automatic maintenance.',
  'Statuses record exploration progress. `selected` is reserved for brainstorm_plan.',
  'Use note for concise factual detail. Keep selectedIds as the candidate pool.',
].join(' ')

export const AUTO_MAINTENANCE_CONTEXT = `<system-reminder>
Ariadne is enabled for this Session. Maintain its map only when the conversation changes structure: a new independent concept becomes a Root; deeper discussion becomes a child of the existing branch; explicit recording or organizing requests update the map. Use brainstorm_map with only changed nodes/links.

Before maintaining the map, identify the current Session goal and the main organizing principle. Preserve the user's existing hierarchy and naming when they already supplied a structure. For one new idea, choose one primary organizing principle. For a choice, organize around goal, constraints, criteria, and candidates. For diagnosis, organize around hypotheses, mechanisms, evidence, and counterevidence. Under one Parent, children should answer the same kind of question. Create a new Root only when content is independently relevant to the current goal. When one idea affects several directions, choose one primary Parent and note the cross-direction effect. Ask at most one essential clarification when classification is materially ambiguous, and do not mix unrelated dimensions at one level.

Rules: one Parent per node; no related edges; derive depth; preserve user directions, parked nodes, notes, frame, and selectedIds. Do not call brainstorm_map for ordinary chat, repeated explanations, wording-only edits, or mechanical UI actions. Proactively add at most 3 genuinely valuable directions in one turn. An explicit small exploration may add at most 5 direct children, explores only the next layer, and does not recurse. Organizing may merge true duplicates and fix Parent links, while preserving notes and the selection pool.
</system-reminder>`

export function maintenanceContextFor(agent, enabled) {
  if (!enabled || !agent?.session) return ''
  const map = latestMap(agent.session.events ?? [])
  if (!map) return `${AUTO_MAINTENANCE_CONTEXT}\nNo map exists yet; create one only from the user request or the explicit initialization prompt.`
  if (map.phase === 'executing') {
    const run = map.executionRun
    return `<system-reminder>Ariadne is in execution. The confirmed graph controls global order. ${run ? `Run ${run.id}: ${run.status}; current node ${run.currentNodeId ?? 'none'}.` : 'The plan awaits user confirmation; do not start a Run yourself.'} Execute only the current running node from its execution prompt, then call brainstorm_execution_complete. Do not execute future nodes, approve user checkpoints, modify the plan/selection, or use brainstorm_map to return to exploration. If waiting, ready, blocked, completed, or cancelled, await the user action.</system-reminder>`
  }
  const frame = map.frame ? ` Goal: ${map.frame.goal || 'unset'}. Organizing principle: ${map.frame.organizingPrinciple || 'unset'}.` : ''
  return `${AUTO_MAINTENANCE_CONTEXT}\nCurrent map: ${map.nodes.length} nodes; update it incrementally.${frame}`
}

const upsertNodeSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', description: 'Stable node id. Omit for parentId + normalized title idempotency.' },
    parentId: { type: 'string', description: 'Parent node for an id-less child. Omit for a root node.' },
    title: { type: 'string', description: 'Required for new nodes; optional for partial updates by id.' },
    note: { type: 'string', description: 'Concise record or implementation detail.' },
    status: { type: 'string', enum: EDITABLE_STATUSES },
    source: { type: 'string', enum: [...SOURCES] },
  },
}

const outputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    message: { type: 'string', required: true },
    changes: {
      type: 'object',
      required: true,
      additionalProperties: false,
      properties: {
        nodesAdded: { type: 'integer', required: true },
        nodesUpdated: { type: 'integer', required: true },
        nodesRemoved: { type: 'integer', required: true },
        linksAdded: { type: 'integer', required: true },
        linksRemoved: { type: 'integer', required: true },
      },
    },
    outline: { type: 'string', required: true },
  },
}

function zeroChanges() {
  return { nodesAdded: 0, nodesUpdated: 0, nodesRemoved: 0, linksAdded: 0, linksRemoved: 0 }
}

function isTypedDirectOps(ops) {
  return Array.isArray(ops) || typeof ops?.type === 'string'
}

/** Apply one direct UI request to a live enabled Session. */
export function applyDirectOps(settingsScope, sessions, sessionId, ops, options = {}) {
  const value = settingsScope.get() ?? {}
  const enabled = Array.isArray(value.enabledSessionIds) && value.enabledSessionIds.includes(sessionId)
  if (!enabled) {
    const error = new Error(`brainstorm is disabled for session ${sessionId}`)
    error.code = 'BRAINSTORM_DISABLED'
    throw error
  }
  const session = sessions.get(sessionId)
  if (!session) {
    const error = new Error(`session ${sessionId} is not live`)
    error.code = 'SESSION_NOT_FOUND'
    throw error
  }
  const current = latestMap(session.events)
  const operations = Array.isArray(ops) ? ops : [ops]
  if (operations.some((op) => op.type === 'begin-execution-node' || op.type === 'reset-execution-node')) {
    if (options.agent?.status === 'running' || options.agent?.inbox?.hasPending) {
      throw new Error('当前 Agent 或消息队列仍在工作；请等待空闲后运行或恢复节点')
    }
  }
  let map
  let changes
  if (isTypedDirectOps(ops)) {
    if (!current) throw new Error('typed Direct Ops require an existing Ariadne map')
    map = applyMapDirectOps(current, ops, { maxNodes: DEFAULT_MAX_NODES, id: `run-${randomUUID()}` })
    changes = zeroChanges()
  } else {
    const result = applyOps(current, ops, { maxNodes: DEFAULT_MAX_NODES })
    map = result.map
    changes = result.changes
  }
  session.append('brainstorm/map', { map })
  if (current?.executionRun && operations.some((op) => op.stopAgent === true && ['cancel-execution-run', 'return-to-exploring'].includes(op.type))) {
    const marker = `BRAINSTORM_EXECUTION run=${current.executionRun.id} `
    for (const message of [...(options.agent?.inbox?.nextTurn ?? []), ...(options.agent?.inbox?.nextStep ?? [])]) {
      if ((message.content ?? []).some((part) => part.type === 'text' && part.text.includes(marker))) options.agent.inbox.remove(message.id)
    }
    if (options.agent?.status === 'running') options.agent.cancel({ kind: 'user' }, { keepInbox: true })
  }
  return {
    ok: true,
    changes,
    nodeCount: map.nodes.length,
    selectedIds: map.selectedIds,
    phase: map.phase,
    finalPlan: map.finalPlan,
    executionRun: map.executionRun,
    map,
  }
}

export function finalPlanMarkdown(map) {
  return toExecutionMarkdown(map)
}

export async function exportFinalPlan(settingsScope, sessions, sessionId, outputPath) {
  const value = settingsScope.get() ?? {}
  if (!Array.isArray(value.enabledSessionIds) || !value.enabledSessionIds.includes(sessionId)) {
    throw new Error(`brainstorm is disabled for session ${sessionId}`)
  }
  const session = sessions.get(sessionId)
  if (!session) throw new Error(`session ${sessionId} is not live`)
  const map = latestMap(session.events)
  if (!map?.finalPlan) throw new Error('export requires an active Final Plan')
  const plan = finalPlanMarkdown(map)
  const cwd = session.header?.cwd ?? process.cwd()
  const target = path.resolve(cwd, outputPath ?? 'brainstorm-execution.md')
  await fs.writeFile(target, plan, 'utf8')
  return { ok: true, path: target, plan }
}

export async function exportExecution(settingsScope, sessions, sessionId, options = {}) {
  if (!(settingsScope.get()?.enabledSessionIds ?? []).includes(sessionId)) throw new Error(`brainstorm is disabled for session ${sessionId}`)
  const session = sessions.get(sessionId)
  if (!session) throw new Error(`session ${sessionId} is not live`)
  const map = latestMap(session.events)
  if (!map?.finalPlan) throw new Error('export requires an active Final Plan')
  const cwd = session.header?.cwd ?? process.cwd()
  const metadata = { sessionId, ...(options.project ? { project: options.project } : {}) }
  const format = options.format ?? 'both'
  if (!['json', 'markdown', 'both'].includes(format)) throw new Error('unknown execution export format')
  const paths = {}
  if (format === 'json' || format === 'both') {
    paths.json = path.resolve(cwd, options.jsonPath ?? 'brainstorm-execution.json')
    await fs.writeFile(paths.json, toExecutionJson(map, metadata), 'utf8')
  }
  if (format === 'markdown' || format === 'both') {
    paths.markdown = path.resolve(cwd, options.markdownPath ?? 'brainstorm-execution.md')
    await fs.writeFile(paths.markdown, toExecutionMarkdown(map, metadata), 'utf8')
  }
  return { ok: true, paths }
}

export async function exportMap(settingsScope, sessions, sessionId, options = {}) {
  const value = settingsScope.get() ?? {}
  if (!Array.isArray(value.enabledSessionIds) || !value.enabledSessionIds.includes(sessionId)) {
    throw new Error(`brainstorm is disabled for session ${sessionId}`)
  }
  const session = sessions.get(sessionId)
  if (!session) throw new Error(`session ${sessionId} is not live`)
  const map = latestMap(session.events)
  if (!map) throw new Error('export requires an existing Ariadne map')
  const cwd = session.header?.cwd ?? process.cwd()
  const format = options.format ?? 'both'
  const paths = {}
  if (format === 'markdown' || format === 'both') {
    paths.markdown = path.resolve(cwd, options.markdownPath ?? 'brainstorm-map.md')
    await fs.writeFile(paths.markdown, mapMarkdown(map), 'utf8')
  }
  if (format === 'canvas' || format === 'both') {
    paths.canvas = path.resolve(cwd, options.canvasPath ?? 'brainstorm-map.canvas')
    await fs.writeFile(paths.canvas, jsonCanvasText(map, options.rects ?? {}), 'utf8')
  }
  return { ok: true, paths, nodeCount: map.nodes.length, edgeCount: map.links.length }
}

export function apply(ctx) {
  registerBrainstormEventTypes()

  const projectReady = ctx.storageDomain.open(brainstormProjectDomainSpec).then((domain) => ({
    domain,
    table: domain.table('projects'),
  }))
  ctx.effect(() => async () => (await projectReady).domain.close(), 'dsh-ariadne.projectDomain')

  ctx.inject(['sessionProjections'], (projectionCtx) => {
    projectionCtx.sessionProjections.register({
      key: 'brainstorm',
      stateSchema: projectionSchema,
      init: () => null,
      apply: (state, event) => event.type === 'brainstorm/map' ? normalizeMap(event.data.map) : state,
      wire: { viewSchema: projectionSchema, view: (state) => state },
      stateVersion: 4,
    })
    projectionCtx.sessionProjections.register({
      key: 'brainstorm.project',
      stateSchema: projectProjectionSchema,
      init: () => null,
      apply: (state, event) => event.type === 'brainstorm/project' ? normalizeProject(event.data.project) : state,
      wire: { viewSchema: projectProjectionSchema, view: (state) => state },
      stateVersion: 5,
    })
  })

  const settingsScope = ctx.settings.register(
    SETTINGS_NAMESPACE,
    zSchemastery.object({ enabledSessionIds: zSchemastery.array(zSchemastery.string()).default([]) }),
    {
      applies: 'live',
      validate(value) {
        const enabled = new Set(value.enabledSessionIds ?? [])
        for (const session of ctx.sessions.list()) {
          if (!enabled.has(session.id) && isActiveExecutionRun(latestMap(session.events ?? [])?.executionRun)) {
            throw new Error('先取消当前 Execution Run 或返回探索，再关闭 Ariadne')
          }
        }
      },
    },
  )
  const enabledIds = () => new Set((settingsScope.get() ?? {}).enabledSessionIds ?? [])
  const isEnabledSession = (sessionId) => enabledIds().has(sessionId)
  const requireEnabled = (toolName, exec) => {
    if (!exec.agent) throw new Error(`${toolName} requires an owning agent session`)
    const sessionId = exec.agent.session?.id ?? exec.agent.id
    if (!isEnabledSession(sessionId)) {
      throw new Error(`brainstorm is disabled for session ${sessionId} — enable it in the Ariadne tab first`)
    }
  }

  const projectsForCwd = async (cwd) => {
    const { table } = await projectReady
    return [...table.entries()]
      .map(([, project]) => normalizeProjectRecord(project))
      .filter((project) => project?.cwd === cwd)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  const attachProject = (session, map, projectId) => {
    if (map.projectId === projectId) return map
    const next = applyOps(map, { projectId }, { maxNodes: DEFAULT_MAX_NODES }).map
    session.append('brainstorm/map', { map: next })
    return next
  }
  const ensureProject = async (session) => {
    const map = latestMap(session.events)
    if (!map) throw new Error('Project requires an existing Ariadne map')
    const cwd = session.header?.cwd
    if (!cwd) throw new Error('Project requires a Session workspace')
    const { table } = await projectReady
    let project = map.projectId ? normalizeProjectRecord(table.get(map.projectId)) : null
    if (!project) {
      const candidates = await projectsForCwd(cwd)
      if (!map.projectId && candidates.length === 1) project = candidates[0]
      else {
        project = createProject({
          id: map.projectId ?? `project-${randomUUID()}`,
          title: map.topic,
          cwd,
        })
        await table.put(project.id, project)
      }
    }
    const nextMap = attachProject(session, map, project.id)
    return { project, map: nextMap, projects: await projectsForCwd(cwd) }
  }
  const refreshProject = async (session, signal) => {
    const ensured = await ensureProject(session)
    const workspaceEntries = await inspectWorkspaceMaps(ctx.sessionPersistence, ensured.project.cwd, signal)
    const entries = workspaceEntries.filter((entry) => entry.map.projectId === ensured.project.id)
    const related = workspaceEntries
      .filter((entry) => entry.map.projectId !== ensured.project.id)
      .map((entry) => ({ ...entry, reason: entry.map.projectId ? '同一工作区的其他 Project' : '同一工作区，尚未归属 Project' }))
    const overview = buildProjectOverview(ensured.project, entries, related)
    session.append('brainstorm/project', { project: overview })
    return { overview, projects: ensured.projects }
  }
  const projectRequest = async (payload, signal) => {
    const sessionId = String(payload.sessionId ?? '')
    if (!isEnabledSession(sessionId)) throw new Error(`brainstorm is disabled for session ${sessionId}`)
    const session = ctx.sessions.get(sessionId)
    if (!session) throw new Error(`session ${sessionId} is not live`)
    const ensured = await ensureProject(session)
    const { table } = await projectReady
    if (payload.action === 'ensure' || payload.action === 'list') return { ok: true, project: ensured.project, projects: ensured.projects }
    if (payload.action === 'refresh') {
      const refreshed = await refreshProject(session, signal)
      return { ok: true, project: refreshed.overview.project, projects: refreshed.projects, overview: refreshed.overview }
    }
    if (payload.action === 'update') {
      const project = updateProject(ensured.project, { title: payload.title, goal: payload.goal })
      await table.put(project.id, project)
      return { ok: true, project, projects: await projectsForCwd(project.cwd) }
    }
    if (payload.action === 'create') {
      const project = createProject({
        id: `project-${randomUUID()}`,
        title: payload.title ?? ensured.map.topic,
        goal: payload.goal,
        cwd: ensured.project.cwd,
      })
      await table.put(project.id, project)
      attachProject(session, latestMap(session.events), project.id)
      return { ok: true, project, projects: await projectsForCwd(project.cwd) }
    }
    if (payload.action === 'attach') {
      const project = normalizeProjectRecord(table.get(String(payload.projectId ?? '')))
      if (!project) throw new Error(`unknown Project ${JSON.stringify(payload.projectId)}`)
      attachProject(session, latestMap(session.events), project.id)
      return { ok: true, project, projects: await projectsForCwd(project.cwd) }
    }
    throw new Error(`unknown Project action ${JSON.stringify(payload.action)}`)
  }

  ctx.inject(['systemPrompt'], (promptCtx) => {
    promptCtx.systemPrompt.context({
      name: 'brainstorm:auto-maintenance',
      order: 135,
      text: (context) => {
        const agent = context.agent
        const sessionId = agent?.session?.id ?? agent?.id
        return maintenanceContextFor(agent, typeof sessionId === 'string' && isEnabledSession(sessionId))
      },
    })
  })

  if (ctx.webServer) {
    ctx.webServer.register({
      kind: 'exact',
      path: '/brainstorm-op',
      async handler(req, res) {
        const send = (status, body) => {
          res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify(body))
        }
        try {
          if (req.method !== 'POST') return send(405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
          const expected = `${ctx.webServer.host}:${ctx.webServer.port}`
          const host = req.headers.host
          if (host !== expected && host !== `localhost:${ctx.webServer.port}`) {
            return send(403, { ok: false, error: { code: 'FORBIDDEN', message: 'loopback only' } })
          }
          const chunks = []
          let size = 0
          for await (const chunk of req) {
            size += chunk.length
            if (size > 512 * 1024) throw new Error('payload too large')
            chunks.push(chunk)
          }
          const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          if (typeof payload.sessionId !== 'string' || (typeof payload.ops !== 'object' || payload.ops === null)) {
            return send(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'payload must be { sessionId, ops }' } })
          }
          if (payload.ops.type === 'export-final-plan') {
            return send(200, await exportFinalPlan(settingsScope, ctx.sessions, payload.sessionId, payload.ops.outputPath))
          }
          if (payload.ops.type === 'export-map') {
            return send(200, await exportMap(settingsScope, ctx.sessions, payload.sessionId, payload.ops))
          }
          const { table } = await projectReady
          const currentMap = latestMap(ctx.sessions.get(payload.sessionId)?.events ?? [])
          const project = currentMap?.projectId ? table.get(currentMap.projectId) : undefined
          if (payload.ops.type === 'export-execution') {
            return send(200, await exportExecution(settingsScope, ctx.sessions, payload.sessionId, { ...payload.ops, project }))
          }
          const agent = ctx.agents.get?.(payload.sessionId) ?? ctx.agents.list().find((entry) => entry.id === payload.sessionId)
          const result = applyDirectOps(settingsScope, ctx.sessions, payload.sessionId, payload.ops, { agent })
          if (project) result.project = { id: project.id, title: project.title, goal: project.goal }
          send(200, result)
        } catch (error) {
          send(400, { ok: false, error: { code: error.code ?? 'BRAINSTORM_OP_ERROR', message: error.message ?? String(error) } })
        }
      },
    })
    ctx.webServer.register({
      kind: 'exact',
      path: '/brainstorm-project',
      async handler(req, res) {
        const send = (status, body) => {
          res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify(body))
        }
        try {
          if (req.method !== 'POST') return send(405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
          const expected = `${ctx.webServer.host}:${ctx.webServer.port}`
          const host = req.headers.host
          if (host !== expected && host !== `localhost:${ctx.webServer.port}`) {
            return send(403, { ok: false, error: { code: 'FORBIDDEN', message: 'loopback only' } })
          }
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          if (typeof payload.sessionId !== 'string' || typeof payload.action !== 'string') {
            return send(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'payload must be { sessionId, action }' } })
          }
          send(200, await projectRequest(payload))
        } catch (error) {
          send(400, { ok: false, error: { code: error.code ?? 'BRAINSTORM_PROJECT_ERROR', message: error.message ?? String(error) } })
        }
      },
    })
  }

  ctx.tools.register(defineTool({
    name: 'brainstorm_map',
    description: TOOL_DESCRIPTION,
    parameters: {
      topic: { type: 'string', description: 'Session starting point. Required on the first call.' },
      frame: {
        type: 'object',
        additionalProperties: false,
        description: 'Current Session goal and the main organizing principle.',
        properties: {
          goal: { type: 'string' },
          organizingPrinciple: { type: 'string' },
        },
      },
      phase: { type: 'string', enum: ['exploring'], description: 'Return an executing map to exploration.' },
      projectId: { type: 'string', description: 'Optional lightweight Project identity.' },
      upsertNodes: { type: 'array', items: upsertNodeSpec },
      removeNodeIds: { type: 'array', items: { type: 'string' } },
      upsertLinks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            from: { type: 'string', required: true },
            to: { type: 'string', required: true },
            kind: { type: 'string', required: true, enum: ['parent'] },
            label: { type: 'string' },
          },
        },
      },
      removeLinks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            from: { type: 'string', required: true },
            to: { type: 'string', required: true },
          },
        },
      },
      selectedIds: { type: 'array', items: { type: 'string' } },
    },
    output: { schema: outputSchema, render: (_args, value) => [{ type: 'text', text: value.message }] },
    execute(args, exec) {
      requireEnabled('brainstorm_map', exec)
      const current = latestMap(exec.agent.session.events)
      if (isActiveExecutionRun(current?.executionRun)) throw new Error('active Execution Run is controlled by the user; complete only the current node')
      const { map, changes } = applyOps(current, args, { maxNodes: DEFAULT_MAX_NODES })
      exec.agent.session.append('brainstorm/map', { map })
      const summary = [
        changes.nodesAdded ? `${changes.nodesAdded} added` : null,
        changes.nodesUpdated ? `${changes.nodesUpdated} updated` : null,
        changes.nodesRemoved ? `${changes.nodesRemoved} removed` : null,
        changes.linksAdded ? `${changes.linksAdded} links added` : null,
        changes.linksRemoved ? `${changes.linksRemoved} links removed` : null,
      ].filter(Boolean).join(', ')
      return {
        ok: true,
        message: `Updated brainstorm map v2 (${map.nodes.length} nodes): ${summary || 'no structural change'}.`,
        changes,
        outline: outlineMap(map),
      }
    },
    presentCall: (args) => ({ card: 'generic', title: 'Update brainstorm map', kind: 'other', rawInput: args }),
  }))

  ctx.tools.register(defineTool({
    name: 'brainstorm_project',
    description: 'Refresh the current persistent Project overview from live and cold Session maps. UI refresh uses the deterministic Host route.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          projectId: { type: 'string', required: true },
          title: { type: 'string', required: true },
          totals: {
            type: 'object',
            required: true,
            additionalProperties: false,
            properties: {
              sessions: { type: 'integer', required: true },
              nodes: { type: 'integer', required: true },
              roots: { type: 'integer', required: true },
              links: { type: 'integer', required: true },
              unexplored: { type: 'integer', required: true },
              selected: { type: 'integer', required: true },
            },
          },
          summary: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.summary }],
    },
    async execute(_args, exec) {
      requireEnabled('brainstorm_project', exec)
      const { overview } = await refreshProject(exec.agent.session, exec.signal)
      const lines = [
        `# 项目脑暴总图：${overview.project.title}`,
        '',
        overview.project.goal ? `> ${overview.project.goal}` : null,
        overview.project.goal ? '' : null,
        `- 会话数：${overview.totals.sessions} · 节点：${overview.totals.nodes} · Root：${overview.totals.roots} · 未探索：${overview.totals.unexplored} · 定案池：${overview.totals.selected}`,
        '',
        ...overview.sessions.flatMap((session) => {
          const s = session.stats
          return [
            `## ${session.title}`,
            `- ${session.map.topic} · 节点 ${s.nodeCount} · Root ${s.rootCount} · 深度 ${s.depthMax}`,
            '',
          ]
        }),
      ].filter((line) => line !== null)
      return { ok: true, projectId: overview.project.id, title: overview.project.title, totals: overview.totals, summary: lines.join('\n') }
    },
    presentCall: (args) => ({ card: 'generic', title: 'Generate project brainstorm overview', kind: 'other', rawInput: args }),
  }))

  ctx.tools.register(defineTool({
    name: 'brainstorm_plan',
    description: 'Generate a user-reviewable acyclic Execution Graph from the current selection pool. Provide task instructions and completion criteria, route keys for decisions, and user-only checkpoints. This tool does not start execution.',
    parameters: {
      graph: {
        type: 'object',
        required: true,
        additionalProperties: false,
        properties: {
          startNodeId: { type: 'string', required: true },
          nodes: {
            type: 'array', required: true,
            items: {
              type: 'object', additionalProperties: false,
              properties: {
                id: { type: 'string', description: 'Stable local ID; omitted IDs become exec-node-1, exec-node-2, ...' },
                kind: { type: 'string', required: true, enum: ['task', 'decision', 'checkpoint'] },
                title: { type: 'string', required: true },
                instruction: { type: 'string', required: true },
                sourceNodeIds: { type: 'array', required: true, items: { type: 'string' } },
                requiredInputs: { type: 'array', items: { type: 'string' } },
                expectedOutputs: { type: 'array', items: { type: 'string' } },
                completionCriteria: { type: 'array', required: true, items: { type: 'string' } },
              },
            },
          },
          edges: {
            type: 'array', required: true,
            items: {
              type: 'object', additionalProperties: false,
              properties: {
                id: { type: 'string' },
                from: { type: 'string', required: true }, to: { type: 'string', required: true },
                condition: { type: 'string', required: true, enum: ['success', 'failure', 'route'] },
                routeKey: { type: 'string' }, label: { type: 'string' },
              },
            },
          },
        },
      },
      uncovered: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string', required: true },
            reason: { type: 'string' },
            sourceNodeIds: { type: 'array', items: { type: 'string' }, description: 'Selected source IDs excluded from the graph; supply their reason here.' },
          },
        },
      },
      outputPath: { type: 'string', description: 'Defaults to <workspace>/brainstorm-execution.md.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          path: { type: 'string', required: true },
          plan: { type: 'string', required: true },
          selectedCount: { type: 'integer', required: true },
          uncoveredCount: { type: 'integer', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.plan }],
    },
    async execute(args, exec) {
      requireEnabled('brainstorm_plan', exec)
      const current = latestMap(exec.agent.session.events)
      if (!current) throw new Error('brainstorm_plan requires an existing map')
      const map = applyFinalPlan(current, args, { maxNodes: DEFAULT_MAX_NODES })
      const baseEvent = exec.agent.session.events.filter((event) => event.type === 'brainstorm/map').at(-1)
      const { table } = await projectReady
      const project = map.projectId ? table.get(map.projectId) : undefined
      const plan = toExecutionMarkdown(map, { sessionId: exec.agent.session.id, project })
      const cwd = exec.agent.session.header?.cwd ?? process.cwd()
      const outputPath = path.resolve(cwd, args.outputPath ?? 'brainstorm-execution.md')
      await fs.writeFile(outputPath, plan, 'utf8')
      if (exec.agent.session.events.filter((event) => event.type === 'brainstorm/map').at(-1) !== baseEvent) throw new Error('the selection or map changed while generating the plan; regenerate from the latest map')
      exec.agent.session.append('brainstorm/map', { map })
      return {
        ok: true,
        path: outputPath,
        plan,
        selectedCount: map.selectedIds.length,
        uncoveredCount: map.finalPlan.uncovered.length,
      }
    },
    presentCall: (args) => ({ card: 'generic', title: 'Finalize brainstorm plan', kind: 'other', rawInput: args }),
  }))

  ctx.tools.register(defineTool({
    name: 'brainstorm_execution_complete',
    description: 'Submit the result of the current running Ariadne graph node. Only the owning Run/current node can advance; user checkpoints cannot be completed by this tool. The Host chooses the next node and ends this Agent turn.',
    parameters: {
      runId: { type: 'string', required: true },
      nodeId: { type: 'string', required: true },
      outcome: { type: 'string', required: true, enum: ['completed', 'failed', 'blocked'] },
      summary: { type: 'string', required: true },
      outputRefs: { type: 'array', items: { type: 'string' } },
      evidence: { type: 'array', items: { type: 'string' } },
      routeKey: { type: 'string', description: 'Required only for a completed Decision; use an exact allowed route key.' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true }, runId: { type: 'string', required: true },
          status: { type: 'string', required: true }, currentNodeId: { type: 'string', required: true },
          message: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.message }],
    },
    execute(args, exec) {
      requireEnabled('brainstorm_execution_complete', exec)
      const current = latestMap(exec.agent.session.events)
      if (!current) throw new Error('execution completion requires an existing map')
      const map = applyExecutionResult(current, args)
      validateMap(map)
      exec.agent.session.append('brainstorm/map', { map })
      exec.concludeTurn?.()
      return {
        ok: true, runId: map.executionRun.id, status: map.executionRun.status,
        currentNodeId: map.executionRun.currentNodeId ?? '',
        message: `${args.summary}\nExecution Run: ${map.executionRun.status}. ${map.executionRun.currentNodeId ? `Next node ${map.executionRun.currentNodeId} awaits the user action.` : 'Run finished.'}`,
      }
    },
    presentCall: (args) => ({ card: 'generic', title: 'Complete execution node', kind: 'other', rawInput: args }),
  }))

  const restrictions = new Map()
  function syncAgent(agent) {
    if (!agent?.ctx?.tools?.restrict) return
    const enabled = isEnabledSession(agent.id)
    const current = restrictions.get(agent.id)
    if (enabled && current) {
      current()
      restrictions.delete(agent.id)
    } else if (!enabled && !current) {
      restrictions.set(agent.id, agent.ctx.tools.restrict({ deny: BRAINSTORM_TOOL_NAMES }))
    }
  }
  const agentOf = (payload) => payload?.agent ?? payload
  ctx.on('agent/created', (payload) => {
    const agent = agentOf(payload)
    if (agent?.ctx?.tools) syncAgent(agent)
  })
  ctx.on('agent/disposed', (payload) => {
    const agent = agentOf(payload)
    if (!agent) return
    const dispose = restrictions.get(agent.id)
    if (dispose) {
      dispose()
      restrictions.delete(agent.id)
    }
  })
  settingsScope.watch(() => {
    for (const agent of ctx.agents.list()) syncAgent(agent)
  })
  for (const agent of ctx.agents.list()) syncAgent(agent)
}
