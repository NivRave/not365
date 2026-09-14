import React, { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useMatchStore } from '../stores/matchStore'
import { MatchCard } from '../components/MatchCard'
import { FollowButton } from '../components/FollowButton'
import { MatchEvent } from '../lib/types'
import { Trash2, Star, Calendar, Copy, Check, Sparkles } from 'lucide-react'

interface FavoritesPageProps {
  onSelectMatch: (id: string) => void
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ onSelectMatch }) => {
  const follows = useAuthStore((s) => s.follows)
  const unfollowEntity = useAuthStore((s) => s.unfollowEntity)
  const user = useAuthStore((s) => s.user)
  const matches = useMatchStore((s) => s.matches)

  const [copied, setCopied] = useState(false)

  const followedIds = new Set(follows.map((f) => f.entity_id))

  // Find matches involving followed entities
  const favoriteMatches = matches.filter(
    (m: MatchEvent) =>
      followedIds.has(m.home_team.id) ||
      followedIds.has(m.away_team.id) ||
      followedIds.has(m.league_id)
  )

  const calendarUrl = user?.calendar_token
    ? `${window.location.origin}/v1/calendar/${user.calendar_token}`
    : ''

  const handleCopyCalendar = () => {
    if (calendarUrl) {
      navigator.clipboard.writeText(calendarUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const popularRecommendations = [
    { type: 'team' as const, id: '1635', name: 'RB Leipzig' },
    { type: 'team' as const, id: '40', name: 'FC Bayern München' },
    { type: 'team' as const, id: 'sim-ars', name: 'Arsenal' },
    { type: 'team' as const, id: 'sim-che', name: 'Chelsea' },
    { type: 'league' as const, id: 'bl1', name: '1. Bundesliga' },
    { type: 'league' as const, id: 'eng.1', name: 'Premier League' },
    { type: 'league' as const, id: 'nba', name: 'NBA' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <span>Favorites Hub</span>
          </h2>
          <p className="text-xs text-slate-400">
            Track your favorite clubs, competitions, and sync to your calendar.
          </p>
        </div>
      </div>

      {/* Calendar Feed Card */}
      {user?.calendar_token && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Live Calendar Feed (.ics)</span>
            </div>
            <button
              onClick={handleCopyCalendar}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary text-slate-900 font-bold text-xs shadow-sm hover:brightness-105 active:scale-95 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Feed URL'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Subscribe in Apple Calendar, Google Calendar, or Outlook to automatically sync kick-off
            times for your favorite clubs.
          </p>
        </div>
      )}

      {/* Followed Matches Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Matches for Your Favorites ({favoriteMatches.length})
          </h3>
        </div>

        {favoriteMatches.length === 0 ? (
          <div className="text-center py-8 bg-surface/40 border border-surfaceLight/50 rounded-2xl p-5 space-y-2">
            <p className="text-xs text-slate-400">
              No live or scheduled matches right now for your followed teams.
            </p>
            <p className="text-[11px] text-slate-500">
              Follow more teams below or check the full schedule on the matches tab.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {favoriteMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                onClick={() => onSelectMatch(m.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Followed Teams & Leagues List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Your Followed Entities ({follows.length})
          </h3>
        </div>

        {follows.length === 0 ? (
          <div className="text-center py-6 bg-surface/30 border border-surfaceLight/40 rounded-xl p-4">
            <p className="text-xs text-slate-400">You haven&apos;t followed any teams or leagues yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {follows.map((f) => (
              <div
                key={f.entity_id}
                className="flex items-center justify-between p-3 bg-surface border border-surfaceLight/60 rounded-xl"
              >
                <div className="min-w-0 pr-2">
                  <h4 className="text-sm font-bold text-white truncate">{f.entity_name}</h4>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {f.entity_type}
                  </span>
                </div>

                <button
                  onClick={() => unfollowEntity(f.entity_id)}
                  className="p-1.5 text-slate-400 hover:text-danger rounded-lg transition-colors flex-shrink-0"
                  title="Remove from favorites"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Popular Teams & Leagues */}
      <div className="space-y-3 pt-2 border-t border-surfaceLight/40">
        <div className="flex items-center gap-1.5 px-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Popular Recommendations
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {popularRecommendations.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between p-2.5 bg-surface/50 border border-surfaceLight/40 rounded-xl"
            >
              <div className="min-w-0 pr-2">
                <h5 className="text-xs font-bold text-slate-200 truncate">{rec.name}</h5>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                  {rec.type}
                </span>
              </div>

              <FollowButton
                entityType={rec.type}
                entityId={rec.id}
                entityName={rec.name}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
