import { create } from 'zustand'
import { MatchEvent, Sport, MatchFilterParams } from '../lib/types'
import * as api from '../lib/api'
import { playGoalChime } from '../lib/audio'

interface MatchState {
  matches: MatchEvent[]
  activeSport: Sport
  statusFilter: 'all' | 'live' | 'upcoming' | 'finished'
  dateFilter: string
  searchQuery: string
  favoritesOnly: boolean
  selectedMatch: MatchEvent | null
  isLoading: boolean
  error: string | null

  setSport: (sport: Sport) => void
  setStatusFilter: (status: 'all' | 'live' | 'upcoming' | 'finished') => void
  setDateFilter: (date: string) => void
  setSearchQuery: (query: string) => void
  setFavoritesOnly: (enabled: boolean) => void
  loadMatches: (overrideParams?: Partial<MatchFilterParams>) => Promise<void>
  loadMatchDetail: (id: string) => Promise<void>
  updateMatchFromSSE: (update: MatchEvent) => void
  appendEventsToMatch: (matchId: string, newEvents: any[]) => void
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matches: [],
  activeSport: 'football',
  statusFilter: 'all',
  dateFilter: 'today',
  searchQuery: '',
  favoritesOnly: false,
  selectedMatch: null,
  isLoading: false,
  error: null,

  setSport: (sport) => {
    set({ activeSport: sport })
    get().loadMatches()
  },

  setStatusFilter: (status) => {
    set({ statusFilter: status })
    get().loadMatches()
  },

  setDateFilter: (date) => {
    set({ dateFilter: date })
    get().loadMatches()
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  setFavoritesOnly: (enabled) => {
    set({ favoritesOnly: enabled })
  },

  loadMatches: async (overrideParams) => {
    set({ isLoading: true, error: null })
    try {
      const state = get()
      const params: MatchFilterParams = {
        sport: state.activeSport,
        status: state.statusFilter,
        date: state.dateFilter,
        search: state.searchQuery || undefined,
        ...overrideParams
      }
      const matches = await api.fetchMatches(params)
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
      const oldMatch = state.matches.find((m) => m.id === updated.id) || state.selectedMatch

      // Detect goal or score increase to trigger chime
      if (oldMatch && updated.score && oldMatch.score) {
        if (
          updated.score.home > oldMatch.score.home ||
          updated.score.away > oldMatch.score.away
        ) {
          playGoalChime()
        }
      }

      // Update in matches list
      const updatedList = state.matches.some((m) => m.id === updated.id)
        ? state.matches.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
        : [updated, ...state.matches]

      // If it's the currently viewed match, update it
      const selected =
        state.selectedMatch?.id === updated.id
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
