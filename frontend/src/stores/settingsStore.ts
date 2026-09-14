import { create } from 'zustand'

export type AppTheme = 'slate' | 'oled' | 'light'

interface SettingsState {
  notificationsEnabled: boolean
  soundEnabled: boolean
  soundVolume: number
  theme: AppTheme
  onlyFollowed: boolean
  setNotifications: (enabled: boolean) => void
  setSound: (enabled: boolean) => void
  setSoundVolume: (volume: number) => void
  setTheme: (theme: AppTheme) => void
  setOnlyFollowed: (enabled: boolean) => void
}

function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.remove('theme-slate', 'theme-oled', 'theme-light')
  root.classList.add(`theme-${theme}`)
  if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    root.classList.add('dark')
  }
}

const savedTheme = (localStorage.getItem('not365_theme') as AppTheme) || 'slate'
const initialVolume = Number(localStorage.getItem('not365_volume')) || 80

// Apply initial theme on load
if (typeof window !== 'undefined') {
  applyTheme(savedTheme)
}

export const useSettingsStore = create<SettingsState>((set) => ({
  notificationsEnabled: localStorage.getItem('not365_notif') === 'true',
  soundEnabled: localStorage.getItem('not365_sound') !== 'false',
  soundVolume: initialVolume,
  theme: savedTheme,
  onlyFollowed: localStorage.getItem('not365_only_followed') === 'true',

  setNotifications: (enabled) => {
    localStorage.setItem('not365_notif', String(enabled))
    set({ notificationsEnabled: enabled })
  },
  setSound: (enabled) => {
    localStorage.setItem('not365_sound', String(enabled))
    set({ soundEnabled: enabled })
  },
  setSoundVolume: (volume) => {
    const clamped = Math.min(100, Math.max(0, volume))
    localStorage.setItem('not365_volume', String(clamped))
    set({ soundVolume: clamped })
  },
  setTheme: (theme) => {
    localStorage.setItem('not365_theme', theme)
    applyTheme(theme)
    set({ theme })
  },
  setOnlyFollowed: (enabled) => {
    localStorage.setItem('not365_only_followed', String(enabled))
    set({ onlyFollowed: enabled })
  }
}))
