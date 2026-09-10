import React from 'react'
import { MatchStatus, Score, Clock } from '../lib/types'

interface LiveScoreTickerProps {
  status: MatchStatus
  score?: Score
  clock?: Clock
  size?: 'sm' | 'lg'
}

export const LiveScoreTicker: React.FC<LiveScoreTickerProps> = ({
  status,
  score,
  clock,
  size = 'sm'
}) => {
  const isLive = status === 'live' || status === 'halftime'
  const isFinished = status === 'finished'

  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Score Numbers */}
        <div className="flex items-center gap-4 text-4xl sm:text-5xl font-black tracking-tight text-white">
          <span>{score ? score.home : '-'}</span>
          <span className="text-slate-500 text-3xl font-normal">:</span>
          <span>{score ? score.away : '-'}</span>
        </div>

        {/* Status Badge & Clock */}
        <div className="mt-3 flex items-center gap-2">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
              {status === 'halftime' ? 'HT' : clock?.display_time || 'LIVE'}
            </span>
          )}
          {isFinished && (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-bold uppercase">
              Full Time
            </span>
          )}
          {status === 'scheduled' && (
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              Upcoming
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-w-[60px]">
      <div className="text-base font-bold text-white tracking-tight">
        {score ? `${score.home} - ${score.away}` : 'vs'}
      </div>
      <div className="text-[11px] font-semibold mt-0.5">
        {isLive && (
          <span className="text-accent font-bold">
            {status === 'halftime' ? 'HT' : clock?.display_time || 'LIVE'}
          </span>
        )}
        {isFinished && <span className="text-slate-400">FT</span>}
        {status === 'scheduled' && <span className="text-slate-400">Preview</span>}
      </div>
    </div>
  )
}
