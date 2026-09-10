import { create } from 'zustand'
import { User, Follow } from '../lib/types'
import * as api from '../lib/api'

interface AuthState {
  user: User | null
  token: string | null
  follows: Follow[]
  isLoading: boolean
  loginDev: (email: string, displayName: string) => Promise<void>
  loadUser: () => Promise<void>
  loadFollows: () => Promise<void>
  followEntity: (type: 'team' | 'league', id: string, name: string) => Promise<void>
  unfollowEntity: (id: string) => Promise<void>
  isFollowing: (id: string) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('not365_token'),
  follows: [],
  isLoading: false,

  loginDev: async (email, displayName) => {
    set({ isLoading: true })
    try {
      const res = await api.devLogin(email, displayName)
      localStorage.setItem('not365_token', res.token)
      set({ user: res.user, token: res.token, isLoading: false })
      await get().loadFollows()
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  loadUser: async () => {
    if (!get().token) return
    try {
      const user = await api.fetchProfile()
      set({ user })
      await get().loadFollows()
    } catch {
      // Token might be invalid
      get().logout()
    }
  },

  loadFollows: async () => {
    if (!get().token) return
    try {
      const follows = await api.fetchFollows()
      set({ follows })
    } catch (e) {
      console.error('Failed to load follows', e)
    }
  },

  followEntity: async (type, id, name) => {
    // Optimistic update
    const previous = get().follows
    const tempFollow: Follow = {
      user_id: get().user?.id || '',
      entity_type: type,
      entity_id: id,
      entity_name: name,
      created_at: new Date().toISOString()
    }
    set({ follows: [...previous, tempFollow] })

    try {
      await api.addFollow(type, id, name)
      await get().loadFollows()
    } catch (e) {
      set({ follows: previous })
      throw e
    }
  },

  unfollowEntity: async (id) => {
    // Optimistic update
    const previous = get().follows
    set({ follows: previous.filter(f => f.entity_id !== id) })

    try {
      await api.removeFollow(id)
      await get().loadFollows()
    } catch (e) {
      set({ follows: previous })
      throw e
    }
  },

  isFollowing: (id) => {
    return get().follows.some(f => f.entity_id === id)
  },

  logout: () => {
    localStorage.removeItem('not365_token')
    set({ user: null, token: null, follows: [] })
  }
}))
