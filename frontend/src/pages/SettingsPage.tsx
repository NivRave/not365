import { useState } from 'react'
import { Bell, Volume2, Smartphone } from 'lucide-react'
import { subscribeToPushNotifications } from '../lib/push'
import { useSettingsStore } from '../stores/settingsStore'

export const SettingsPage: React.FC = () => {
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled)
  const setNotifications = useSettingsStore((s) => s.setNotifications)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const setSound = useSettingsStore((s) => s.setSound)
  const [subscribing, setSubscribing] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black tracking-tight text-white">
          Notifications & Alerts
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure native VAPID Web Push and audio alerts
        </p>
      </div>

      <div className="space-y-3">
        {/* Push Notification Card */}
        <div className="bg-surface border border-surfaceLight/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Live Match Alerts</h4>
                <p className="text-xs text-slate-400">Goals, kick-offs, and final whistle</p>
              </div>
            </div>

            <button
              onClick={handleEnablePush}
              disabled={subscribing}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                notificationsEnabled
                  ? 'bg-accent/10 border border-accent/30 text-accent'
                  : 'bg-primary text-slate-950 hover:bg-primary/90'
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
            <p className="text-xs text-slate-300 bg-surfaceLight/40 p-2.5 rounded-xl">
              {statusMsg}
            </p>
          )}
        </div>

        {/* Audio Toggle Card */}
        <div className="bg-surface border border-surfaceLight/60 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Audio Sounds</h4>
              <p className="text-xs text-slate-400">Play chime when goals occur</p>
            </div>
          </div>

          <button
            onClick={() => setSound(!soundEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              soundEnabled ? 'bg-primary' : 'bg-slate-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* PWA Info */}
        <div className="bg-surface border border-surfaceLight/60 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Smartphone className="w-4 h-4 text-primary" />
            <span>Install PWA to Home Screen</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            In Chrome/Edge or Safari iOS, tap <strong>Share</strong> or the browser menu and select <strong>"Add to Home Screen"</strong> for full-screen offline experience.
          </p>
        </div>
      </div>
    </div>
  )
}
