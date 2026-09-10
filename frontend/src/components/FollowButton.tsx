import React from 'react'
import { Star } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface FollowButtonProps {
  entityType: 'team' | 'league'
  entityId: string
  entityName: string
  className?: string
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  entityType,
  entityId,
  entityName,
  className = ''
}) => {
  const isFollowing = useAuthStore((s) => s.isFollowing(entityId))
  const followEntity = useAuthStore((s) => s.followEntity)
  const unfollowEntity = useAuthStore((s) => s.unfollowEntity)
  const user = useAuthStore((s) => s.user)
  const loginDev = useAuthStore((s) => s.loginDev)

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (!user) {
      // Auto-login with default dev user if not logged in
      await loginDev('guest@not365.app', 'Guest Fan')
    }

    if (isFollowing) {
      await unfollowEntity(entityId)
    } else {
      await followEntity(entityType, entityId, entityName)
    }
  }

  return (
    <button
      onClick={handleToggle}
      title={isFollowing ? 'Unfollow' : 'Follow'}
      className={`p-1.5 rounded-full transition-colors ${
        isFollowing
          ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
      } ${className}`}
    >
      <Star className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
    </button>
  )
}
