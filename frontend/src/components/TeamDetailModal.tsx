import React, { useEffect, useState } from 'react'
import { fetchTeamDetail } from '../lib/api'
import { TeamDetailResponse } from '../lib/types'
import { FollowButton } from './FollowButton'
import { MatchCard } from './MatchCard'
import { X, Shield, Calendar, History, TrendingUp } from 'lucide-react'

interface TeamDetailModalProps {
  teamId: string
  onClose: () => void
  onSelectMatch: (id: string) => void
}

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({
  teamId,
  onClose,
  onSelectMatch,
}) => {
  const [data, setData] = useState<TeamDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchTeamDetail(teamId)
      .then((res) => setData(res))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [teamId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-surfaceLight/80 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-surfaceLight/50 flex items-center justify-between bg-surface/70">
          <div className="flex items-center gap-3">
            {data?.team.logo_url ? (
              <img
                src={data.team.logo_url}
                alt=""
                className="w-12 h-12 object-contain rounded-xl bg-slate-800 p-1"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-black text-slate-400">
                <Shield className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <h3 className="font-black text-white text-base leading-tight">
                {data?.team.name || 'Team Details'}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">
                {data?.team.short_name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {data && (
              <FollowButton
                entityType="team"
                entityId={data.team.id}
                entityName={data.team.name}
              />
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <div className="text-center py-16 space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400">Loading team profile...</p>
            </div>
          ) : !data ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Failed to load team details.
            </div>
          ) : (
            <>
              {/* Form Guide */}
              <div className="bg-surface/50 border border-surfaceLight/60 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>Recent Form (Last 5)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {data.form.length > 0 ? (
                    data.form.map((f, i) => (
                      <span
                        key={i}
                        className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                          f === 'W'
                            ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                            : f === 'D'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {f}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No recent games</span>
                  )}
                </div>
              </div>

              {/* Upcoming Matches */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Upcoming Schedule ({data.upcoming_matches.length})
                  </h4>
                </div>
                {data.upcoming_matches.length === 0 ? (
                  <p className="text-xs text-slate-500 italic px-1">
                    No scheduled fixtures in the immediate calendar.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.upcoming_matches.map((m) => (
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

              {/* Recent Matches */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <History className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Recent Results ({data.recent_matches.length})
                  </h4>
                </div>
                {data.recent_matches.length === 0 ? (
                  <p className="text-xs text-slate-500 italic px-1">No completed matches recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {data.recent_matches.map((m) => (
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
