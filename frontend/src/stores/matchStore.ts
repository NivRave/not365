import { create } from 'zustand'
import { MatchEvent, Sport } from '../lib/types'
import * as api from '../lib/api'

interface MatchState {
  matches: MatchEvent[]
  activeSport: Sport
  selectedMatch: MatchEvent | null
  isLoading: boolean
  error: string | null
  setSport: (sport: Sport) => void
  loadMatches: () => Promise<void>
  loadMatchDetail: (id: string) => Promise<void>
  updateMatchFromSSE: (update: MatchEvent) => void
  appendEventsToMatch: (matchId: string, newEvents: any[]) => void
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matches: [],
  activeSport: 'football',
  selectedMatch: null,
  isLoading: false,
  error: null,

  setSport: (sport) => {
    set({ activeSport: sport })
    get().loadMatches()
  },

  loadMatches: async () => {
    set({ isLoading: true, error: null })
    try {
      const matches = await api.fetchMatches(get().activeSport)
      set({ matches, isLoading: false })
    } catch (e: any) {
      set({ isLoading: false, error: e.message || 'Failed to load matches' })
    }
  },

  loadMatchDetail: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const match = await api.fetchMatch(id)
      set({ selectedMatch: match, isLoading: false })
    } catch (e: any) {
      set({ isLoading: false, error: e.message || 'Failed to load match detail' })
    }
  },

  updateMatchFromSSE: (updated: MatchEvent) => {
    set((state) => {
      // Update in matches list
      const updatedList = state.matches.map((m) =>
        m.id === updated.id ? { ...m, ...updated } : m
      )
      // If it's the currently viewed match, update it
      const selected = state.selectedMatch?.id === updated.id
        ? { ...state.selectedMatch, ...updated }
        : state.selectedMatch

      return {
        matches: updatedList,
        selectedMatch: selected
      }
    })
  },

  appendEventsToMatch: (matchId: string, newEvents: any[]) => {
    set((state) => {
      if (state.selectedMatch && state.selectedMatch.id === matchId) {
        const existing = state.selectedMatch.events || []
        return {
          selectedMatch: {
            ...state.selectedMatch,
            events: [...existing, ...newEvents]
          }
        }
      }
      return state
    })
  }
}))
