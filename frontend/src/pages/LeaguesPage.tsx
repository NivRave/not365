import React, { useEffect, useState } from 'react'
import { fetchLeagues } from '../lib/api'
import { Sport } from '../lib/types'
import { FollowButton } from '../components/FollowButton'

export const LeaguesPage: React.FC = () => {
  const [sport, setSport] = useState<Sport>('football')
  const [leagues, setLeagues] = useState<{ id: string; name: string; country: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchLeagues(sport)
      .then((data) => setLeagues(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [sport])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['football', 'basketball', 'mma'] as Sport[]).map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
              sport === s
                ? 'bg-primary text-slate-900 shadow-sm'
                : 'bg-surface border border-surfaceLight text-slate-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading leagues...</div>
        ) : (
          leagues.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between p-3.5 bg-surface border border-surfaceLight/60 rounded-xl"
            >
              <div>
                <h4 className="text-sm font-bold text-white">{l.name}</h4>
                <span className="text-xs text-slate-400">{l.country}</span>
              </div>
              <FollowButton
                entityType="league"
                entityId={l.id}
                entityName={l.name}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
