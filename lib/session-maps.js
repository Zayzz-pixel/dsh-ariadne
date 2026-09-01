import { latestMap } from './map-state.js'

export function sessionTitle(events, fallback) {
  let title = ''
  for (const event of events ?? []) {
    if (event?.type === 'session/title' && typeof event.data?.title === 'string') title = event.data.title.trim()
  }
  return title || fallback
}

export async function inspectWorkspaceMaps(sessionPersistence, cwd, signal) {
  const headers = await sessionPersistence.list(signal)
  const entries = []
  for (const header of headers) {
    if (header.cwd !== cwd) continue
    const inspection = await sessionPersistence.inspect(header.id, signal)
    const map = latestMap(inspection.events)
    if (!map) continue
    entries.push({
      sessionId: header.id,
      title: sessionTitle(inspection.events, map.topic),
      map,
    })
  }
  return entries
}
