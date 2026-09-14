import React, { useState } from 'react'
import { Bell, Volume2, VolumeX, Volume1, Smartphone, Moon, Sun, Contrast, Play, Check } from 'lucide-react'
import { subscribeToPushNotifications } from '../lib/push'
import { useSettingsStore, AppTheme } from '../stores/settingsStore'
import { playGoalChime } from '../lib/audio'

export const SettingsPage: React.FC = () => {
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled)
  const setNotifications = useSettingsStore((s) => s.setNotifications)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const setSound = useSettingsStore((s) => s.setSound)
  const soundVolume = useSettingsStore((s) => s.soundVolume)
  const setSoundVolume = useSettingsStore((s) => s.setSoundVolume)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  const [subscribing, setSubscribing] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false)

  const handleEnablePush = async () => {
    setSubscribing(true)
    setStatusMsg(null)
    const ok = await subscribeToPushNotifications()
    setSubscribing(false)
    if (ok) {
      setNotifications(true)
      setStatusMsg('Web Push notifications enabled successfully!')
    } else {
      setStatusMsg('Failed to enable push. Ensure permissions are allowed in browser settings.')
    }
  }

  const handleTestSound = () => {
    setIsPlayingTestSound(true)
    playGoalChime(soundVolume)
    setTimeout(() => setIsPlayingTestSound(false), 850)
  }

  const themes: { id: AppTheme; name: string; desc: string; icon: React.ReactNode; bg: string; border: string }[] = [
    {
      id: 'slate',
      name: 'Slate Dark',
      desc: 'Deep navy midnight stadium theme',
      icon: <Moon className="w-4 h-4 text-sky-400" />,
      bg: 'bg-[#0f172a]',
      border: 'border-[#334155]',
    },
    {
      id: 'oled',
      name: 'Pure OLED Black',
      desc: 'True zero-power black for OLED screens',
      icon: <Contrast className="w-4 h-4 text-emerald-400" />,
      bg: 'bg-black',
      border: 'border-[#27272a]',
    },
    {
      id: 'light',
      name: 'Light Stadium',
      desc: 'High contrast clean daytime mode',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      bg: 'bg-slate-100',
      border: 'border-slate-300',
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div>
        <h2 className="text-xl font-black tracking-tight text-text-primary">
          Settings & Preferences
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Customize themes, live audio alerts, and push notifications
        </p>
      </div>

      <div className="space-y-4">
        {/* Display Theme Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Contrast className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">Display Theme</h4>
                <p className="text-xs text-text-secondary">Choose your interface appearance and contrast level</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-light text-text-secondary border border-border capitalize">
              {theme}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {themes.map((t) => {
              const isSelected = theme === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 relative ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-surface-light shadow-md'
                      : 'border-border bg-surface hover:bg-surface-light/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-surface border border-border">
                        {t.icon}
                      </div>
                      <span className="text-xs font-bold text-text-primary">{t.name}</span>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-primary text-slate-950 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Theme swatch preview */}
                  <div className={`w-full h-7 rounded-lg ${t.bg} border ${t.border} flex items-center px-2 gap-1.5 mb-2`}>
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    <div className="w-8 h-1.5 rounded-full bg-white/20"></div>
                  </div>

                  <p className="text-[10px] text-text-muted leading-tight">{t.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Audio & Live Sound Alerts Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                {soundEnabled ? (
                  soundVolume > 50 ? <Volume2 className="w-5 h-5" /> : <Volume1 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">Match Audio Alerts</h4>
                <p className="text-xs text-text-secondary">Synthesized real-time chime on goals and whistles</p>
              </div>
            </div>

            {/* Master Sound Switch */}
            <button
              onClick={() => setSound(!soundEnabled)}
              aria-label="Toggle Audio"
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                soundEnabled ? 'bg-primary' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Volume Slider & Test Button */}
          {soundEnabled && (
            <div className="pt-3 border-t border-border space-y-4 animate-fade-in">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-secondary">Alert Volume</span>
                  <span className="font-mono font-bold text-primary">{soundVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  className="w-full h-2 bg-surface-light rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-text-muted">
                  Test the real-time chord synthesizer:
                </span>
                <button
                  onClick={handleTestSound}
                  disabled={isPlayingTestSound}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-light hover:bg-surface-light/80 border border-border text-text-primary flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Play className={`w-3 h-3 text-accent ${isPlayingTestSound ? 'animate-spin' : ''}`} />
                  <span>{isPlayingTestSound ? 'Playing...' : 'Test Chime 🔔'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Push Notification Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">Native Web Push</h4>
                <p className="text-xs text-text-secondary">Background alerts via browser VAPID push service</p>
              </div>
            </div>

            <button
              onClick={handleEnablePush}
              disabled={subscribing}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                notificationsEnabled
                  ? 'bg-accent/10 border border-accent/30 text-accent'
                  : 'bg-primary text-slate-950 hover:bg-primary/90 shadow-sm'
              }`}
            >
              {subscribing
                ? 'Registering...'
                : notificationsEnabled
                ? 'Active'
                : 'Enable'}
            </button>
          </div>

          {statusMsg && (
            <p className="text-xs text-text-secondary bg-surface-light p-2.5 rounded-xl border border-border">
              {statusMsg}
            </p>
          )}
        </div>

        {/* PWA Info Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <Smartphone className="w-4 h-4 text-primary" />
            <span>Install Not365 App (PWA)</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            In Chrome/Edge on desktop, or Safari/Chrome on mobile, tap <strong>Share / Menu</strong> and select <strong>"Add to Home Screen"</strong> for an app-store-grade, full-screen offline experience.
          </p>
        </div>
      </div>
    </div>
  )
}
