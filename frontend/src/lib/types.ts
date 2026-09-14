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
  stats?: MatchStats
  lineups?: MatchLineups
  sequence: number
  updated_at: string
}

export interface LineupPlayer {
  id: string
  name: string
  number: number
  position: string
  grid?: string
  is_captain?: boolean
  rating?: number
}

export interface TeamLineup {
  formation: string
  starting_xi: LineupPlayer[]
  substitutes: LineupPlayer[]
  coach?: string
}

export interface MatchLineups {
  home: TeamLineup
  away: TeamLineup
}

export interface MatchStats {
  possession_home: number
  possession_away: number
  shots_home: number
  shots_away: number
  shots_on_target_home: number
  shots_on_target_away: number
  corners_home: number
  corners_away: number
  fouls_home: number
  fouls_away: number
  yellow_cards_home?: number
  yellow_cards_away?: number
  red_cards_home?: number
  red_cards_away?: number
}

export interface StandingsRow {
  position: number
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  form: ('W' | 'D' | 'L')[]
}

export interface H2HEncounter {
  id: string
  date: string
  league_name: string
  home_team: Team
  away_team: Team
  home_score: number
  away_score: number
  winner: 'home' | 'away' | 'draw'
}

export interface TeamDetailResponse {
  team: Team
  form: ('W' | 'D' | 'L')[]
  recent_matches: MatchEvent[]
  upcoming_matches: MatchEvent[]
}

export interface MatchFilterParams {
  sport?: Sport
  status?: string
  date?: string
  league_id?: string
  team_id?: string
  team_ids?: string[]
  search?: string
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
