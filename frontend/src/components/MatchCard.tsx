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

  return (
    <div
      onClick={onClick}
      className={`group relative bg-surface border rounded-xl p-3.5 transition-all cursor-pointer hover:border-slate-600 hover:shadow-lg ${
        isLive ? 'border-accent/30 shadow-accent/5' : 'border-surfaceLight/60'
      }`}
    >
      {/* Top row: League and Follow button */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-3 border-b border-surfaceLight/40 pb-2">
        <span className="font-medium truncate max-w-[200px]">{match.league_name}</span>
        <div className="flex items-center gap-1">
          <FollowButton
            entityType="team"
            entityId={match.home_team.id}
            entityName={match.home_team.name}
          />
        </div>
      </div>

      {/* Main row: Home Team, Score/Status, Away Team */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Home Team */}
        <div className="flex items-center gap-2.5 overflow-hidden">
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
        </div>

        {/* Live Score Ticker */}
        <LiveScoreTicker
          status={match.status}
          score={match.score}
          clock={match.clock}
          size="sm"
        />

        {/* Away Team */}
        <div className="flex items-center justify-end gap-2.5 overflow-hidden">
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
