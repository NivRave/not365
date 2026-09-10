import React from 'react'
import { Event } from '../lib/types'

interface EventTimelineProps {
  events?: Event[]
  homeTeamId: string
  awayTeamId: string
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events = [],
  homeTeamId,
  awayTeamId
}) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No match events recorded yet.
      </div>
    )
  }

  // Sort events chronologically
  const sorted = [...events].sort((a, b) => (a.minute || 0) - (b.minute || 0))

  return (
    <div className="relative pl-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-[2px] before:bg-surfaceLight/60 space-y-4">
      {sorted.map((ev, i) => {
        const isHome = ev.team_id === homeTeamId
        const isGoal = ev.type.toLowerCase().includes('goal')
        const isCard = ev.type.toLowerCase().includes('card')

        let icon = '⚡'
        if (isGoal) icon = '⚽'
        else if (isCard && ev.type.toLowerCase().includes('red')) icon = '🟥'
        else if (isCard) icon = '🟨'

        return (
          <div key={ev.id || i} className="relative flex items-center gap-3">
            <span className="absolute -left-6 flex items-center justify-center w-5 h-5 rounded-full bg-surface border border-surfaceLight text-xs">
              {icon}
            </span>

            <div className="flex-1 bg-surface/50 border border-surfaceLight/40 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white mr-2">
                  {ev.minute ? `${ev.minute}'` : ''}
                </span>
                <span className="text-slate-300 font-medium">
                  {ev.player || ev.type}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                {isHome ? 'Home' : ev.team_id === awayTeamId ? 'Away' : ev.type}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
