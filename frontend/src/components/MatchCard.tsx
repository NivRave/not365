import React from 'react'
import { MatchEvent } from '../lib/types'
import { LiveScoreTicker } from './LiveScoreTicker'
import { FollowButton } from './FollowButton'

interface MatchCardProps {
  match: MatchEvent
  onClick: () => void
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onClick }) => {
  const isLive = match.status === 'live' || match.status === 'halftime'

  const formattedStartTime = new Date(match.start_time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  return (
    <div
      onClick={onClick}
      className={`group relative bg-surface border rounded-xl p-3.5 transition-all cursor-pointer hover:border-slate-500 hover:shadow-lg ${
        isLive ? 'border-accent/40 shadow-accent/5' : 'border-surfaceLight/60'
      }`}
    >
      {/* Top row: League and Kick-off / Status */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-3 border-b border-surfaceLight/40 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-slate-300 truncate text-[11px] uppercase tracking-wider">
            {match.league_name}
          </span>
          <FollowButton
            entityType="league"
            entityId={match.league_id}
            entityName={match.league_name}
            className="p-1 scale-90"
          />
        </div>

        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
          {match.status === 'scheduled' ? (
            <span>{formattedStartTime}</span>
          ) : isLive ? (
            <span className="flex items-center gap-1 text-accent font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping"></span>
              {match.clock?.display_time || 'LIVE'}
            </span>
          ) : (
            <span className="text-slate-400 font-semibold">FT</span>
          )}
        </div>
      </div>

      {/* Main row: Home Team, Score/Status, Away Team */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Home Team */}
        <div className="flex items-center gap-2 overflow-hidden">
          {match.home_team.logo_url ? (
            <img
              src={match.home_team.logo_url}
              alt=""
              className="w-7 h-7 object-contain rounded-full bg-slate-900/50 p-0.5 flex-shrink-0"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0">
              {match.home_team.short_name?.slice(0, 3) || 'H'}
            </div>
          )}
          <span className="text-sm font-semibold text-slate-100 truncate group-hover:text-primary transition-colors">
            {match.home_team.short_name || match.home_team.name}
          </span>
          <FollowButton
            entityType="team"
            entityId={match.home_team.id}
            entityName={match.home_team.name}
            className="p-0.5 scale-75 opacity-70 group-hover:opacity-100"
          />
        </div>

        {/* Live Score Ticker */}
        <div className="px-2">
          <LiveScoreTicker
            status={match.status}
            score={match.score}
            clock={match.clock}
            size="sm"
          />
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-end gap-2 overflow-hidden">
          <FollowButton
            entityType="team"
            entityId={match.away_team.id}
            entityName={match.away_team.name}
            className="p-0.5 scale-75 opacity-70 group-hover:opacity-100"
          />
          <span className="text-sm font-semibold text-slate-100 truncate text-right group-hover:text-primary transition-colors">
            {match.away_team.short_name || match.away_team.name}
          </span>
          {match.away_team.logo_url ? (
            <img
              src={match.away_team.logo_url}
              alt=""
              className="w-7 h-7 object-contain rounded-full bg-slate-900/50 p-0.5 flex-shrink-0"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0">
              {match.away_team.short_name?.slice(0, 3) || 'A'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
