import React, { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { Calendar, Copy, Check, LogOut, UserCheck } from 'lucide-react'

export const ProfilePage: React.FC = () => {
  const user = useAuthStore((s) => s.user)
  const loginDev = useAuthStore((s) => s.loginDev)
  const logout = useAuthStore((s) => s.logout)
  const isLoading = useAuthStore((s) => s.isLoading)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    await loginDev(email, name || email.split('@')[0])
  }

  const calendarUrl = user
    ? `${window.location.origin}/v1/calendar/${user.calendar_token}.ics`
    : null

  const handleCopyCalendar = () => {
    if (!calendarUrl) return
    navigator.clipboard.writeText(calendarUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black tracking-tight text-white">Account & Calendar</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage identity and export your followed sports schedule
        </p>
      </div>

      {user ? (
        <div className="space-y-4">
          {/* User Profile Card */}
          <div className="bg-surface border border-surfaceLight/60 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black text-base border border-primary/30">
                {user.display_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{user.display_name}</h3>
                <p className="text-xs text-slate-400">{user.email}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-accent font-semibold mt-1">
                  <UserCheck className="w-3 h-3" /> Authenticated
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-danger rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Dynamic Calendar Feed Card */}
          <div className="bg-surface border border-surfaceLight/60 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2.5 text-sm font-bold text-white">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Apple / Google / Outlook Calendar Sync</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Subscribe to your custom RFC 5545 calendar feed. Any team or league you follow will automatically sync match times to your phone or desktop calendar.
            </p>

            <div className="flex items-center gap-2 bg-slate-900 border border-surfaceLight rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={calendarUrl || ''}
                className="bg-transparent text-xs text-slate-300 font-mono flex-1 outline-none truncate"
              />
              <button
                onClick={handleCopyCalendar}
                className="px-3 py-1 rounded-lg bg-surface text-xs font-bold text-white hover:bg-surfaceLight transition-colors flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Dev Mode Instant Login Form */
        <div className="bg-surface border border-surfaceLight/60 rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Quick Sign-In</h3>
            <p className="text-xs text-slate-400">
              Dev-Mode stub allows instant access without requiring OAuth setup.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="fan@example.com"
                className="w-full bg-slate-900 border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sports Fan"
                className="w-full bg-slate-900 border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:border-primary outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
