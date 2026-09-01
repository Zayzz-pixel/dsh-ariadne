// Validates the latest durable Ariadne map against the v2 composition rules:
// tree-only (no `related` cross-links), one parent per node, no cycles, every
// link endpoint exists, v2 depth is derived, and phase/Final Plan agree.
// Usage: DSH_SESSION_JSONL=<path> node scripts/validate-map.mjs
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { normalizeMap, treeFacts, validateMap } from '../lib/map-state.js'

const jsonl = process.env.DSH_SESSION_JSONL
if (!jsonl) {
  console.error('DSH_SESSION_JSONL is not set')
  process.exit(2)
}

const raw = execFileSync('zstd', ['-d', '-c', jsonl], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8')
const maps = []
for (const line of raw.split('\n')) {
  if (!line.trim()) continue
  let event
  try {
    event = JSON.parse(line)
  } catch {
    continue
  }
  if (event.type === 'brainstorm/map' && event.data?.map) maps.push(event.data.map)
}
const rawMap = maps.at(-1)
if (!rawMap) {
  console.error('no brainstorm/map event found')
  process.exit(1)
}

const errors = []
const nodeIds = new Set(rawMap.nodes.map((n) => n.id))
if (nodeIds.size !== rawMap.nodes.length) errors.push('duplicate node ids')
const parentOf = new Map()
for (const link of rawMap.links) {
  if (link.kind === 'related') errors.push(`related cross-link ${link.from}->${link.to} violates the tree-only rule`)
  if (!nodeIds.has(link.from) || !nodeIds.has(link.to)) errors.push(`dangling link ${link.from}->${link.to}`)
  if (link.kind === 'parent') {
    if (parentOf.has(link.to)) errors.push(`node ${link.to} has more than one parent`)
    parentOf.set(link.to, link.from)
  }
}
for (const child of parentOf.keys()) {
  const seen = new Set()
  let cursor = child
  while (cursor !== undefined && !seen.has(cursor)) {
    seen.add(cursor)
    cursor = parentOf.get(cursor)
  }
  if (cursor !== undefined) errors.push(`parent cycle involving ${child}`)
}
if (rawMap.version >= 2) {
  for (const node of rawMap.nodes) if ('depth' in node) errors.push(`v2 node ${node.id} persists depth`)
}
let map
try {
  map = normalizeMap(rawMap)
  validateMap(map)
} catch (error) {
  errors.push(error.message ?? String(error))
}

const facts = map ? treeFacts(map) : null
console.log(`map: ${rawMap.topic}`)
console.log(`version=${map?.version ?? rawMap.version} nodes=${rawMap.nodes.length} links=${rawMap.links.length} related=${rawMap.links.filter((l) => l.kind === 'related').length} phase=${map?.phase ?? rawMap.phase ?? 'exploring'} depthMax=${facts ? Math.max(0, ...facts.depthById.values()) : 'invalid'}`)
if (map?.finalPlan) console.log(`plan=v${map.finalPlan.version} executionNodes=${map.finalPlan.graph.nodes.length} edges=${map.finalPlan.graph.edges.length} run=${map.executionRun?.status ?? 'not-started'} current=${map.executionRun?.currentNodeId ?? 'none'}`)
if (errors.length > 0) {
  console.error('VIOLATIONS:')
  for (const error of errors) console.error(' -', error)
  process.exit(1)
}
console.log('OK: v2-normalizable, tree-only, single-parent, acyclic, all endpoints exist')
