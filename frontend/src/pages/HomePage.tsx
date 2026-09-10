import React, { useEffect } from 'react'
import { useMatchStore } from '../stores/matchStore'
import { MatchCard } from '../components/MatchCard'
import { Sport } from '../lib/types'
import { RefreshCw } from 'lucide-react'

interface HomePageProps {
  onSelectMatch: (id: string) => void
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectMatch }) => {
  const matches = useMatchStore((s) => s.matches)
  const activeSport = useMatchStore((s) => s.activeSport)
  const setSport = useMatchStore((s) => s.setSport)
  const loadMatches = useMatchStore((s) => s.loadMatches)
  const isLoading = useMatchStore((s) => s.isLoading)

  useEffect(() => {
    loadMatches()
  }, [loadMatches, activeSport])

  const sports: { id: Sport; label: string; icon: string }[] = [
    { id: 'football', label: 'Football', icon: '⚽' },
    { id: 'basketball', label: 'Basketball', icon: '🏀' },
    { id: 'mma', label: 'MMA / UFC', icon: '🥊' },
  ]

  // Group matches by league
  const leaguesMap = matches.reduce((acc, match) => {
    const key = match.league_name || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(match)
    return acc
  }, {} as Record<string, typeof matches>)

  const liveCount = matches.filter(
    (m) => m.status === 'live' || m.status === 'halftime'
  ).length

  return (
    <div className="space-y-4">
      {/* Sport Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {sports.map((s) => {
          const isActive = activeSport === s.id
          return (
            <button
              key={s.id}
              onClick={() => setSport(s.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-slate-900 shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-surface border border-surfaceLight text-slate-300 hover:text-white'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Header Bar with Live Badge & Refresh */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black tracking-tight text-white capitalize">
            {activeSport} Matches
          </h2>
          {liveCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-accent/20 border border-accent/30 text-accent text-[11px] font-bold">
              {liveCount} Live
            </span>
          )}
        </div>

        <button
          onClick={() => loadMatches()}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-surface border border-surfaceLight text-slate-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Match List Grouped by League */}
      {isLoading && matches.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Loading matches...</p>
        </div>
      ) : Object.keys(leaguesMap).length === 0 ? (
        <div className="text-center py-16 bg-surface/50 border border-surfaceLight/50 rounded-2xl p-6">
          <p className="text-slate-400 text-sm mb-2">No scheduled matches right now.</p>
          <p className="text-xs text-slate-500">
            Check back during live game times or switch sports.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(leaguesMap).map(([leagueName, leagueMatches]) => (
            <div key={leagueName} className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {leagueName}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {leagueMatches.length} games
                </span>
              </div>

              <div className="space-y-2">
                {leagueMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    onClick={() => onSelectMatch(m.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
