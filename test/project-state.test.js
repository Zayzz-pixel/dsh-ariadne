import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildProjectOverview, createProject, normalizeProject, updateProject } from '../lib/project-state.js'
import { inspectWorkspaceMaps, sessionTitle } from '../lib/session-maps.js'
import { applyOps } from '../lib/map-state.js'

const NOW = '2026-08-21T00:00:00.000Z'

function sampleMap(projectId, topic = 'Session A') {
  return applyOps(null, {
    topic,
    projectId,
    upsertNodes: [
      { id: 'root', title: 'Root', status: 'expanded', source: 'user' },
      { id: 'child', parentId: 'root', title: 'Child', status: 'unexplored' },
    ],
    selectedIds: ['root'],
  }, { now: NOW }).map
}

test('Project metadata normalizes and updates without storing session ids', () => {
  const project = createProject({ id: 'project-a', title: '  Product  ', goal: 'Ship v2', cwd: '/ws', now: NOW })
  assert.deepEqual(project, {
    id: 'project-a',
    title: 'Product',
    goal: 'Ship v2',
    cwd: '/ws',
    createdAt: NOW,
    updatedAt: NOW,
  })
  const updated = updateProject(project, { title: 'Product v2', goal: '' }, '2026-08-22T00:00:00.000Z')
  assert.equal(updated.title, 'Product v2')
  assert.equal(updated.goal, undefined)
  assert.equal('sessionIds' in updated, false)
  assert.equal(normalizeProject({}), null)
})

test('Project Overview derives sessions, roots, selection and totals from maps', () => {
  const project = createProject({ id: 'project-a', title: 'Product', goal: 'Ship v2', cwd: '/ws', now: NOW })
  const overview = buildProjectOverview(project, [
    { sessionId: 's1', title: 'First', map: sampleMap('project-a', 'A') },
    { sessionId: 's2', title: 'Second', map: sampleMap('project-a', 'B') },
  ], [{ sessionId: 's3', title: 'Related', map: sampleMap('project-b', 'C'), reason: '同一工作区' }], NOW)

  assert.equal(overview.version, 2)
  assert.equal(overview.sessions.length, 2)
  assert.equal(overview.sessions[0].roots[0].nodeCount, 2)
  assert.deepEqual(overview.sessions[0].selected, [{ id: 'root', title: 'Root' }])
  assert.deepEqual(overview.sessions[0].unexplored, [{ id: 'child', title: 'Child' }])
  assert.deepEqual(overview.totals, { sessions: 2, nodes: 4, roots: 2, links: 2, unexplored: 2, selected: 2 })
  assert.equal(overview.related[0].projectId, 'project-b')
})

test('Persistent Session inspection includes cold maps and their latest titles', async () => {
  const map = sampleMap('project-a')
  const persistence = {
    async list() {
      return [{ id: 's1', cwd: '/ws' }, { id: 's2', cwd: '/else' }, { id: 's3', cwd: '/ws' }]
    },
    async inspect(id) {
      if (id === 's1') return { events: [{ type: 'session/title', data: { title: 'Cold Session' } }, { type: 'brainstorm/map', data: { map } }] }
      return { events: [{ type: 'session/title', data: { title: 'No Map' } }] }
    },
  }
  const entries = await inspectWorkspaceMaps(persistence, '/ws')
  assert.deepEqual(entries.map((entry) => entry.sessionId), ['s1'])
  assert.equal(entries[0].title, 'Cold Session')
  assert.equal(sessionTitle([{ type: 'session/title', data: { title: 'A' } }, { type: 'session/title', data: { title: 'B' } }], 'fallback'), 'B')
})
