import { create } from 'zustand'

interface SettingsState {
  notificationsEnabled: boolean
  soundEnabled: boolean
  onlyFollowed: boolean
  setNotifications: (enabled: boolean) => void
  setSound: (enabled: boolean) => void
  setOnlyFollowed: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  notificationsEnabled: localStorage.getItem('not365_notif') === 'true',
  soundEnabled: localStorage.getItem('not365_sound') !== 'false',
  onlyFollowed: localStorage.getItem('not365_only_followed') === 'true',

  setNotifications: (enabled) => {
    localStorage.setItem('not365_notif', String(enabled))
    set({ notificationsEnabled: enabled })
  },
  setSound: (enabled) => {
    localStorage.setItem('not365_sound', String(enabled))
    set({ soundEnabled: enabled })
  },
  setOnlyFollowed: (enabled) => {
    localStorage.setItem('not365_only_followed', String(enabled))
    set({ onlyFollowed: enabled })
  }
}))
