import {
  MatchEvent,
  User,
  Follow,
  Sport,
  MatchFilterParams,
  Team,
  TeamDetailResponse,
  StandingsRow,
  H2HEncounter,
  MatchLineups,
} from './types'

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

export async function fetchMatches(params?: Sport | MatchFilterParams): Promise<MatchEvent[]> {
  const query = new URLSearchParams()
  if (typeof params === 'string') {
    query.set('sport', params)
  } else if (params) {
    if (params.sport) query.set('sport', params.sport)
    if (params.status) query.set('status', params.status)
    if (params.date) query.set('date', params.date)
    if (params.league_id) query.set('league_id', params.league_id)
    if (params.team_id) query.set('team_id', params.team_id)
    if (params.team_ids && params.team_ids.length > 0) query.set('team_ids', params.team_ids.join(','))
    if (params.search) query.set('search', params.search)
  }
  const queryString = query.toString() ? `?${query.toString()}` : ''
  const res = await fetch(`${API_BASE}/v1/matches${queryString}`)
  if (!res.ok) throw new Error('Failed to fetch matches')
  return res.json()
}

export async function fetchTeams(sport?: Sport, leagueId?: string): Promise<Team[]> {
  const query = new URLSearchParams()
  if (sport) query.set('sport', sport)
  if (leagueId) query.set('league_id', leagueId)
  const queryString = query.toString() ? `?${query.toString()}` : ''
  const res = await fetch(`${API_BASE}/v1/teams${queryString}`)
  if (!res.ok) throw new Error('Failed to fetch teams')
  return res.json()
}

export async function fetchTeamDetail(id: string): Promise<TeamDetailResponse> {
  const res = await fetch(`${API_BASE}/v1/teams/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error('Failed to fetch team details')
  return res.json()
}

export async function fetchLeagueStandings(id: string): Promise<StandingsRow[]> {
  const res = await fetch(`${API_BASE}/v1/leagues/${encodeURIComponent(id)}/standings`)
  if (!res.ok) throw new Error('Failed to fetch standings')
  return res.json()
}

export async function fetchMatchH2H(id: string): Promise<H2HEncounter[]> {
  const res = await fetch(`${API_BASE}/v1/matches/${encodeURIComponent(id)}/h2h`)
  if (!res.ok) throw new Error('Failed to fetch head-to-head')
  return res.json()
}

export async function simulateMatch(): Promise<MatchEvent> {
  const res = await fetch(`${API_BASE}/v1/matches/simulate`, {
    method: 'POST'
  })
  if (!res.ok) throw new Error('Failed to trigger simulation')
  return res.json()
}

export async function fetchMatch(id: string): Promise<MatchEvent> {
  const res = await fetch(`${API_BASE}/v1/matches/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error('Failed to fetch match')
  return res.json()
}

export async function fetchMatchLineups(id: string): Promise<MatchLineups> {
  const res = await fetch(`${API_BASE}/v1/matches/${encodeURIComponent(id)}/lineups`)
  if (!res.ok) throw new Error('Failed to fetch match lineups')
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
