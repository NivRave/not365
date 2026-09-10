export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed' | 'cancelled'
export type Sport = 'football' | 'basketball' | 'mma'

export interface Team {
  id: string
  name: string
  short_name: string
  logo_url?: string
}

export interface Score {
  home: number
  away: number
  meta?: Record<string, any>
}

export interface Clock {
  display_time: string
  period?: number
  is_running: boolean
}

export interface Event {
  id: string
  type: string
  minute?: number
  player?: string
  team_id?: string
  occurred_at?: string
}

export interface MatchEvent {
  id: string
  sport: Sport
  league_id: string
  league_name: string
  home_team: Team
  away_team: Team
  status: MatchStatus
  start_time: string
  score?: Score
  clock?: Clock
  events?: Event[]
  sequence: number
  updated_at: string
}

export interface User {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  calendar_token: string
  created_at: string
  updated_at: string
}

export interface Follow {
  user_id: string
  entity_type: 'team' | 'league'
  entity_id: string
  entity_name: string
  created_at: string
}
