import React from 'react'
import { useAuthStore } from '../stores/authStore'
import { Trash2, Star } from 'lucide-react'

export const FavoritesPage: React.FC = () => {
  const follows = useAuthStore((s) => s.follows)
  const unfollowEntity = useAuthStore((s) => s.unfollowEntity)

  if (follows.length === 0) {
    return (
      <div className="text-center py-20 bg-surface/50 border border-surfaceLight/50 rounded-2xl p-6 space-y-3">
        <Star className="w-8 h-8 text-yellow-400 mx-auto stroke-[1.5]" />
        <h3 className="text-sm font-bold text-white">No followed teams or leagues</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Tap the star icon next to any match or league to get personalized alerts and calendar sync.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight text-white">
          Your Follows ({follows.length})
        </h2>
      </div>

      <div className="space-y-2">
        {follows.map((f) => (
          <div
            key={f.entity_id}
            className="flex items-center justify-between p-3.5 bg-surface border border-surfaceLight/60 rounded-xl"
          >
            <div>
              <h4 className="text-sm font-bold text-white">{f.entity_name}</h4>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                {f.entity_type}
              </span>
            </div>

            <button
              onClick={() => unfollowEntity(f.entity_id)}
              className="p-2 text-slate-400 hover:text-danger rounded-lg transition-colors"
              title="Remove from favorites"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
