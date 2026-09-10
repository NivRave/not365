import { useEffect, useRef } from 'react'
import { useMatchStore } from '../stores/matchStore'
import { MatchEvent } from '../lib/types'

export function useMatchSSE(matchId: string | undefined) {
  const updateMatchFromSSE = useMatchStore((s) => s.updateMatchFromSSE)
  const appendEventsToMatch = useMatchStore((s) => s.appendEventsToMatch)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!matchId) return

    const sseUrl = `/v1/sse/match/${encodeURIComponent(matchId)}`
    const es = new EventSource(sseUrl)
    eventSourceRef.current = es

    es.addEventListener('match_snapshot', (e: MessageEvent) => {
      try {
        const snapshot = JSON.parse(e.data) as MatchEvent
        updateMatchFromSSE(snapshot)
      } catch (err) {
        console.error('Failed to parse match_snapshot:', err)
      }
    })

    es.addEventListener('match_update', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.snapshot) {
          updateMatchFromSSE(payload.snapshot)
        }
        if (payload.delta && payload.delta.length > 0) {
          appendEventsToMatch(matchId, payload.delta)
        }
      } catch (err) {
        console.error('Failed to parse match_update:', err)
      }
    })

    es.addEventListener('replay', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.replay && payload.replay.length > 0) {
          appendEventsToMatch(matchId, payload.replay)
        }
      } catch (err) {
        console.error('Failed to parse replay:', err)
      }
    })

    es.onerror = (err) => {
      console.warn('SSE connection error, browser will auto-reconnect:', err)
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [matchId, updateMatchFromSSE, appendEventsToMatch])
}
