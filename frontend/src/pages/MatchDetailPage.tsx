import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useMatchStore } from '../stores/matchStore'
import { useMatchSSE } from '../hooks/useMatchSSE'
import { LiveScoreTicker } from '../components/LiveScoreTicker'
import { FollowButton } from '../components/FollowButton'
import { EventTimeline } from '../components/EventTimeline'

interface MatchDetailPageProps {
  matchId: string
  onBack: () => void
}

export const MatchDetailPage: React.FC<MatchDetailPageProps> = ({ matchId, onBack }) => {
  const selectedMatch = useMatchStore((s) => s.selectedMatch)
  const loadMatchDetail = useMatchStore((s) => s.loadMatchDetail)
  const isLoading = useMatchStore((s) => s.isLoading)

  // Real-time SSE live connection
  useMatchSSE(matchId)

  useEffect(() => {
    loadMatchDetail(matchId)
  }, [matchId, loadMatchDetail])

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

  return (
    <div className="space-y-6 pb-12">
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
              day: 'numeric'
            })}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <FollowButton
            entityType="team"
            entityId={match.home_team.id}
            entityName={match.home_team.name}
          />
        </div>
      </div>

      {/* Hero Scoreboard */}
      <div className="bg-surface border border-surfaceLight/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Home Team */}
          <div className="flex flex-col items-center text-center space-y-2">
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

      {/* Match Timeline Section */}
      <div className="bg-surface border border-surfaceLight/60 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black tracking-tight text-white uppercase">
            Match Timeline
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
    </div>
  )
}
