import React, { useEffect, useState } from 'react'
import { fetchLeagueStandings, fetchMatches } from '../lib/api'
import { StandingsRow, MatchEvent } from '../lib/types'
import { FollowButton } from './FollowButton'
import { MatchCard } from './MatchCard'
import { X, Trophy, Calendar, Shield } from 'lucide-react'

interface LeagueDetailModalProps {
  leagueId: string
  leagueName: string
  country?: string
  onClose: () => void
  onSelectMatch: (id: string) => void
  onSelectTeam?: (teamId: string) => void
}

export const LeagueDetailModal: React.FC<LeagueDetailModalProps> = ({
  leagueId,
  leagueName,
  country,
  onClose,
  onSelectMatch,
  onSelectTeam,
}) => {
  const [activeTab, setActiveTab] = useState<'standings' | 'fixtures'>('standings')
  const [standings, setStandings] = useState<StandingsRow[]>([])
  const [matches, setMatches] = useState<MatchEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchLeagueStandings(leagueId).catch(() => []),
      fetchMatches({ league_id: leagueId, date: 'all' }).catch(() => [])
    ]).then(([st, m]) => {
      setStandings(st)
      setMatches(m)
    }).finally(() => setLoading(false))
  }, [leagueId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-surfaceLight/80 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-surfaceLight/50 flex items-center justify-between bg-surface/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">{leagueName}</h3>
              {country && <span className="text-xs text-slate-400 font-medium">{country}</span>}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <FollowButton
              entityType="league"
              entityId={leagueId}
              entityName={leagueName}
            />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-surfaceLight/50 px-4 pt-2 gap-4 bg-surface/30">
          <button
            onClick={() => setActiveTab('standings')}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'standings'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Standings Table
          </button>
          <button
            onClick={() => setActiveTab('fixtures')}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'fixtures'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Fixtures & Results ({matches.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="text-center py-16 space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400">Loading league data...</p>
            </div>
          ) : activeTab === 'standings' ? (
            standings.length === 0 ? (
              <div className="text-center py-12 bg-surface/30 rounded-xl p-4">
                <p className="text-xs text-slate-400">
                  Standings will be generated once league matches conclude.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-surfaceLight/60">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface text-[10px] text-slate-400 uppercase tracking-wider border-b border-surfaceLight/50">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-6">#</th>
                      <th className="py-2.5 px-2">Club</th>
                      <th className="py-2.5 px-1.5 text-center">P</th>
                      <th className="py-2.5 px-1.5 text-center">W</th>
                      <th className="py-2.5 px-1.5 text-center">D</th>
                      <th className="py-2.5 px-1.5 text-center">L</th>
                      <th className="py-2.5 px-1.5 text-center">GD</th>
                      <th className="py-2.5 px-2 text-center font-bold text-white">PTS</th>
                      <th className="py-2.5 px-2 text-center">Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surfaceLight/40">
                    {standings.map((row) => (
                      <tr
                        key={row.team.id}
                        onClick={() => onSelectTeam && onSelectTeam(row.team.id)}
                        className="hover:bg-surface/60 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-2 text-center font-bold text-slate-400">
                          {row.position}
                        </td>
                        <td className="py-2 px-2 flex items-center gap-2">
                          {row.team.logo_url ? (
                            <img
                              src={row.team.logo_url}
                              alt=""
                              className="w-4 h-4 object-contain rounded-full flex-shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-slate-800 text-[8px] flex items-center justify-center text-slate-400">
                              {row.team.short_name?.slice(0, 2)}
                            </div>
                          )}
                          <span className="font-semibold text-slate-200 truncate max-w-[110px]">
                            {row.team.short_name || row.team.name}
                          </span>
                        </td>
                        <td className="py-2 px-1.5 text-center text-slate-400">{row.played}</td>
                        <td className="py-2 px-1.5 text-center text-slate-400">{row.won}</td>
                        <td className="py-2 px-1.5 text-center text-slate-400">{row.drawn}</td>
                        <td className="py-2 px-1.5 text-center text-slate-400">{row.lost}</td>
                        <td className="py-2 px-1.5 text-center text-slate-400 font-mono text-[11px]">
                          {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                        </td>
                        <td className="py-2 px-2 text-center font-black text-primary">
                          {row.points}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {row.form && row.form.length > 0 ? (
                              row.form.map((f, idx) => (
                                <span
                                  key={idx}
                                  className={`w-3.5 h-3.5 rounded text-[9px] font-bold flex items-center justify-center ${
                                    f === 'W'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : f === 'D'
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  {f}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : matches.length === 0 ? (
            <div className="text-center py-12 bg-surface/30 rounded-xl p-4">
              <p className="text-xs text-slate-400">No fixtures found for this league.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {matches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  onClick={() => {
                    onClose()
                    onSelectMatch(m.id)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
