import { MatchEvent, User, Follow, Sport } from './types'

const API_BASE = ''

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('not365_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchSports(): Promise<{ id: string; name: string; icon: string }[]> {
  const res = await fetch(`${API_BASE}/v1/sports`)
  if (!res.ok) throw new Error('Failed to fetch sports')
  return res.json()
}

export async function fetchLeagues(sport: Sport): Promise<{ id: string; name: string; country: string }[]> {
  const res = await fetch(`${API_BASE}/v1/sports/${sport}/leagues`)
  if (!res.ok) throw new Error('Failed to fetch leagues')
  return res.json()
}

export async function fetchMatches(sport: Sport): Promise<MatchEvent[]> {
  const res = await fetch(`${API_BASE}/v1/matches?sport=${sport}`)
  if (!res.ok) throw new Error('Failed to fetch matches')
  return res.json()
}

export async function fetchMatch(id: string): Promise<MatchEvent> {
  const res = await fetch(`${API_BASE}/v1/matches/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error('Failed to fetch match')
  return res.json()
}

export async function devLogin(email: string, displayName: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, display_name: displayName })
  })
  if (!res.ok) throw new Error('Failed to login')
  return res.json()
}

export async function fetchProfile(): Promise<User> {
  const res = await fetch(`${API_BASE}/v1/me`, {
    headers: getAuthHeaders()
  })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

export async function fetchFollows(): Promise<Follow[]> {
  const res = await fetch(`${API_BASE}/v1/me/follows`, {
    headers: getAuthHeaders()
  })
  if (!res.ok) throw new Error('Failed to fetch follows')
  return res.json()
}

export async function addFollow(entityType: 'team' | 'league', entityID: string, entityName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/me/follows`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_type: entityType, entity_id: entityID, entity_name: entityName })
  })
  if (!res.ok) throw new Error('Failed to follow')
}

export async function removeFollow(entityID: string): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/me/follows/${encodeURIComponent(entityID)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  if (!res.ok) throw new Error('Failed to unfollow')
}

export async function registerPushSubscription(sub: PushSubscription): Promise<void> {
  const jsonSub = sub.toJSON()
  const res = await fetch(`${API_BASE}/v1/me/push`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: {
        p256dh: jsonSub.keys?.p256dh,
        auth: jsonSub.keys?.auth
      }
    })
  })
  if (!res.ok) throw new Error('Failed to register push subscription')
}
