import { mapStats, normalizeMap, treeFacts } from './map-state.js'

function clean(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

export function normalizeProject(raw) {
  if (typeof raw !== 'object' || raw === null) return null
  const id = clean(raw.id)
  const title = clean(raw.title)
  if (!id || !title) return null
  const goal = clean(raw.goal)
  const cwd = clean(raw.cwd)
  const createdAt = clean(raw.createdAt, new Date().toISOString())
  const updatedAt = clean(raw.updatedAt, createdAt)
  return {
    id,
    title,
    ...(goal ? { goal } : {}),
    ...(cwd ? { cwd } : {}),
    createdAt,
    updatedAt,
  }
}

export function createProject({ id, title, goal, cwd, now = new Date().toISOString() }) {
  return normalizeProject({ id, title, goal, cwd, createdAt: now, updatedAt: now })
}

export function updateProject(project, patch, now = new Date().toISOString()) {
  return normalizeProject({
    ...project,
    ...(patch.title === undefined ? {} : { title: patch.title }),
    ...(patch.goal === undefined ? {} : { goal: patch.goal }),
    updatedAt: now,
  })
}

export function buildProjectOverview(project, entries, related = [], now = new Date().toISOString()) {
  const normalizedProject = normalizeProject(project)
  if (!normalizedProject) throw new Error('project overview requires a valid Project')
  const sessions = entries.map((entry) => {
    const map = normalizeMap(entry.map)
    const facts = treeFacts(map)
    const stats = mapStats(map)
    return {
      sessionId: entry.sessionId,
      title: clean(entry.title, map.topic),
      map,
      stats: {
        ...stats,
        rootCount: facts.roots.length,
        selectedCount: map.selectedIds.length,
      },
      roots: facts.roots.map((id) => {
        const node = facts.byId.get(id)
        return {
          id,
          title: node.title,
          ...(node.note ? { note: node.note } : {}),
          nodeCount: 1 + (facts.descendantsById.get(id)?.length ?? 0),
        }
      }),
      selected: map.selectedIds.map((id) => facts.byId.get(id)).filter(Boolean).map((node) => ({ id: node.id, title: node.title })),
      unexplored: map.nodes.filter((node) => node.status === 'unexplored').map((node) => ({ id: node.id, title: node.title })),
      updatedAt: map.updatedAt,
    }
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return {
    version: 2,
    project: normalizedProject,
    generatedAt: now,
    sessions,
    related: related.map((entry) => ({
      sessionId: entry.sessionId,
      title: clean(entry.title, entry.map?.topic ?? entry.sessionId),
      topic: clean(entry.map?.topic, entry.title ?? entry.sessionId),
      ...(entry.map?.projectId ? { projectId: entry.map.projectId } : {}),
      reason: clean(entry.reason, '同一工作区'),
    })),
    totals: {
      sessions: sessions.length,
      nodes: sessions.reduce((sum, entry) => sum + entry.stats.nodeCount, 0),
      roots: sessions.reduce((sum, entry) => sum + entry.stats.rootCount, 0),
      links: sessions.reduce((sum, entry) => sum + entry.stats.linkCount, 0),
      unexplored: sessions.reduce((sum, entry) => sum + entry.stats.statuses.unexplored, 0),
      selected: sessions.reduce((sum, entry) => sum + entry.stats.selectedCount, 0),
    },
  }
}
