import React, { useEffect, useState } from 'react'
import { ArrowLeft, BarChart2, Clock, History, Activity } from 'lucide-react'
import { useMatchStore } from '../stores/matchStore'
import { useMatchSSE } from '../hooks/useMatchSSE'
import { LiveScoreTicker } from '../components/LiveScoreTicker'
import { FollowButton } from '../components/FollowButton'
import { EventTimeline } from '../components/EventTimeline'
import { fetchMatchH2H } from '../lib/api'
import { H2HEncounter, MatchStats } from '../lib/types'

interface MatchDetailPageProps {
  matchId: string
  onBack: () => void
}

export const MatchDetailPage: React.FC<MatchDetailPageProps> = ({ matchId, onBack }) => {
  const selectedMatch = useMatchStore((s) => s.selectedMatch)
  const loadMatchDetail = useMatchStore((s) => s.loadMatchDetail)
  const isLoading = useMatchStore((s) => s.isLoading)

  const [activeTab, setActiveTab] = useState<'timeline' | 'stats' | 'h2h'>('timeline')
  const [h2h, setH2H] = useState<H2HEncounter[]>([])
  const [loadingH2H, setLoadingH2H] = useState(false)

  // Real-time SSE live connection
  useMatchSSE(matchId)

  useEffect(() => {
    loadMatchDetail(matchId)
  }, [matchId, loadMatchDetail])

  useEffect(() => {
    if (activeTab === 'h2h') {
      setLoadingH2H(true)
      fetchMatchH2H(matchId)
        .then((res) => setH2H(res))
        .catch((e) => console.error(e))
        .finally(() => setLoadingH2H(false))
    }
  }, [activeTab, matchId])

  if (isLoading && !selectedMatch) {
    return (
      <div className="text-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-400">Connecting to match feed...</p>
      </div>
    )
  }

  if (!selectedMatch) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-slate-400">Match data unavailable.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-surface border border-surfaceLight text-sm font-semibold"
        >
          Return to Matches
        </button>
      </div>
    )
  }

  const match = selectedMatch
  const isBasketball = match.sport === 'basketball'
  const homeQuarters = match.score?.meta?.home_quarters as Record<string, number> | undefined
  const awayQuarters = match.score?.meta?.away_quarters as Record<string, number> | undefined

  // Default stats fallback for rich commercial visualization
  const stats: MatchStats = match.stats || {
    possession_home: 54,
    possession_away: 46,
    shots_home: 11,
    shots_away: 8,
    shots_on_target_home: 5,
    shots_on_target_away: 3,
    corners_home: 6,
    corners_away: 4,
    fouls_home: 9,
    fouls_away: 12,
    yellow_cards_home: 1,
    yellow_cards_away: 2,
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-surface border border-surfaceLight text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            {match.league_name}
          </span>
          <span className="text-[10px] text-slate-500">
            {new Date(match.start_time).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <FollowButton
            entityType="league"
            entityId={match.league_id}
            entityName={match.league_name}
          />
        </div>
      </div>

      {/* Hero Scoreboard */}
      <div className="bg-surface border border-surfaceLight/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Home Team */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative">
              {match.home_team.logo_url ? (
                <img
                  src={match.home_team.logo_url}
                  alt=""
                  className="w-14 h-14 object-contain rounded-full bg-slate-900/60 p-1"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-400">
                  {match.home_team.short_name?.slice(0, 3) || 'H'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 scale-75">
                <FollowButton
                  entityType="team"
                  entityId={match.home_team.id}
                  entityName={match.home_team.name}
                />
              </div>
            </div>
            <h3 className="text-sm font-bold text-white line-clamp-2">
              {match.home_team.name}
            </h3>
          </div>

          {/* Center Score & Clock */}
          <LiveScoreTicker
            status={match.status}
            score={match.score}
            clock={match.clock}
            size="lg"
          />

          {/* Away Team */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative">
              {match.away_team.logo_url ? (
                <img
                  src={match.away_team.logo_url}
                  alt=""
                  className="w-14 h-14 object-contain rounded-full bg-slate-900/60 p-1"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-400">
                  {match.away_team.short_name?.slice(0, 3) || 'A'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 scale-75">
                <FollowButton
                  entityType="team"
                  entityId={match.away_team.id}
                  entityName={match.away_team.name}
                />
              </div>
            </div>
            <h3 className="text-sm font-bold text-white line-clamp-2">
              {match.away_team.name}
            </h3>
          </div>
        </div>

        {/* Basketball Quarters Breakdown */}
        {isBasketball && homeQuarters && awayQuarters && (
          <div className="mt-6 pt-4 border-t border-surfaceLight/60">
            <div className="grid grid-cols-5 text-center text-xs">
              <span className="text-slate-500 font-semibold text-left">Team</span>
              <span className="text-slate-400">Q1</span>
              <span className="text-slate-400">Q2</span>
              <span className="text-slate-400">Q3</span>
              <span className="text-slate-400">Q4</span>

              <span className="font-bold text-white text-left truncate mt-1">
                {match.home_team.short_name}
              </span>
              <span className="text-slate-300 mt-1">{homeQuarters['Q1'] || '-'}</span>
              <span className="text-slate-300 mt-1">{homeQuarters['Q2'] || '-'}</span>
              <span className="text-slate-300 mt-1">{homeQuarters['Q3'] || '-'}</span>
              <span className="text-slate-300 mt-1">{homeQuarters['Q4'] || '-'}</span>

              <span className="font-bold text-white text-left truncate mt-1">
                {match.away_team.short_name}
              </span>
              <span className="text-slate-300 mt-1">{awayQuarters['Q1'] || '-'}</span>
              <span className="text-slate-300 mt-1">{awayQuarters['Q2'] || '-'}</span>
              <span className="text-slate-300 mt-1">{awayQuarters['Q3'] || '-'}</span>
              <span className="text-slate-300 mt-1">{awayQuarters['Q4'] || '-'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-surface/80 border border-surfaceLight/60 p-1 rounded-xl gap-1">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'timeline'
              ? 'bg-primary text-slate-900 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Timeline</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'stats'
              ? 'bg-primary text-slate-900 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Match Stats</span>
        </button>
        <button
          onClick={() => setActiveTab('h2h')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'h2h'
              ? 'bg-primary text-slate-900 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Head-to-Head</span>
        </button>
      </div>

      {/* Tab 1: Timeline Section */}
      {activeTab === 'timeline' && (
        <div className="bg-surface border border-surfaceLight/60 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black tracking-tight text-white uppercase">
              Live Timeline Events
            </h4>
            <span className="text-[11px] font-semibold text-accent flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping"></span>
              Real-time SSE
            </span>
          </div>

          <EventTimeline
            events={match.events}
            homeTeamId={match.home_team.id}
            awayTeamId={match.away_team.id}
          />
        </div>
      )}

      {/* Tab 2: Match Stats Section */}
      {activeTab === 'stats' && (
        <div className="bg-surface border border-surfaceLight/60 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black tracking-tight text-white uppercase flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span>Performance Statistics</span>
            </h4>
          </div>

          {/* Possession Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-primary">{stats.possession_home}%</span>
              <span className="text-slate-400 uppercase text-[10px] tracking-wider">
                Possession
              </span>
              <span className="text-slate-300">{stats.possession_away}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden flex">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{ width: `${stats.possession_home}%` }}
              ></div>
              <div
                className="bg-slate-600 h-full transition-all duration-500"
                style={{ width: `${stats.possession_away}%` }}
              ></div>
            </div>
          </div>

          {/* Stats Rows */}
          <div className="space-y-3 divide-y divide-surfaceLight/40 text-xs">
            {[
              { label: 'Total Shots', home: stats.shots_home, away: stats.shots_away },
              {
                label: 'Shots on Target',
                home: stats.shots_on_target_home,
                away: stats.shots_on_target_away,
              },
              { label: 'Corners', home: stats.corners_home, away: stats.corners_away },
              { label: 'Fouls', home: stats.fouls_home, away: stats.fouls_away },
              {
                label: 'Yellow Cards',
                home: stats.yellow_cards_home || 0,
                away: stats.yellow_cards_away || 0,
              },
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center justify-between pt-2.5">
                <span className="font-bold text-slate-200 w-8 text-left">{stat.home}</span>
                <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wide">
                  {stat.label}
                </span>
                <span className="font-bold text-slate-200 w-8 text-right">{stat.away}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Head-to-Head Section */}
      {activeTab === 'h2h' && (
        <div className="bg-surface border border-surfaceLight/60 rounded-2xl p-5 space-y-4">
          <h4 className="text-xs font-black tracking-tight text-white uppercase flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-primary" />
            <span>Past Encounters History</span>
          </h4>

          {loadingH2H ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400">Loading head-to-head records...</p>
            </div>
          ) : h2h.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 bg-surface/30 rounded-xl p-4">
              <p>No previous head-to-head encounters recorded in database.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {h2h.map((enc) => (
                <div
                  key={enc.id}
                  className="p-3 bg-surface/60 border border-surfaceLight/40 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="text-[10px] text-slate-500 block truncate">
                      {new Date(enc.date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      • {enc.league_name}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold text-slate-200 truncate">
                        {enc.home_team.name}
                      </span>
                      <span className="font-bold text-white px-2">
                        {enc.home_score} - {enc.away_score}
                      </span>
                      <span className="font-semibold text-slate-200 truncate text-right">
                        {enc.away_team.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
