import React, { useEffect, useState, useMemo } from 'react'
import { fetchLeagues, fetchTeams } from '../lib/api'
import { Sport, Team } from '../lib/types'
import { FollowButton } from '../components/FollowButton'
import { LeagueDetailModal } from '../components/LeagueDetailModal'
import { TeamDetailModal } from '../components/TeamDetailModal'
import { Trophy, Users, Search, ChevronRight, X } from 'lucide-react'

interface LeaguesPageProps {
  onSelectMatch: (id: string) => void
}

export const LeaguesPage: React.FC<LeaguesPageProps> = ({ onSelectMatch }) => {
  const [sport, setSport] = useState<Sport>('football')
  const [activeTab, setActiveTab] = useState<'leagues' | 'teams'>('leagues')
  const [leagues, setLeagues] = useState<{ id: string; name: string; country: string }[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const [selectedLeague, setSelectedLeague] = useState<{ id: string; name: string; country: string } | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    if (activeTab === 'leagues') {
      fetchLeagues(sport)
        .then((data) => setLeagues(data))
        .catch((e) => console.error(e))
        .finally(() => setLoading(false))
    } else {
      fetchTeams(sport)
        .then((data) => setTeams(data))
        .catch((e) => console.error(e))
        .finally(() => setLoading(false))
    }
  }, [sport, activeTab])

  const filteredLeagues = useMemo(() => {
    if (!search.trim()) return leagues
    const q = search.toLowerCase()
    return leagues.filter((l) => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q))
  }, [leagues, search])

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams
    const q = search.toLowerCase()
    return teams.filter((t) => t.name.toLowerCase().includes(q) || t.short_name?.toLowerCase().includes(q))
  }, [teams, search])

  return (
    <div className="space-y-4">
      {/* Sport Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['football', 'basketball', 'mma'] as Sport[]).map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
              sport === s
                ? 'bg-primary text-slate-900 shadow-md shadow-primary/20 scale-[1.02]'
                : 'bg-surface border border-surfaceLight text-slate-300 hover:text-white'
            }`}
          >
            {s === 'football' ? '⚽ Football' : s === 'basketball' ? '🏀 Basketball' : '🥊 MMA / UFC'}
          </button>
        ))}
      </div>

      {/* Directory Tab Switcher: Leagues vs Teams */}
      <div className="flex bg-surface/80 border border-surfaceLight/60 p-1 rounded-xl gap-1">
        <button
          onClick={() => setActiveTab('leagues')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'leagues'
              ? 'bg-primary text-slate-900 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Leagues & Standings</span>
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'teams'
              ? 'bg-primary text-slate-900 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Teams Directory</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={activeTab === 'leagues' ? 'Search competitions...' : 'Search clubs & teams...'}
          className="w-full bg-surface border border-surfaceLight/70 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Directory Listing */}
      {loading ? (
        <div className="text-center py-16 space-y-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Loading {activeTab}...</p>
        </div>
      ) : activeTab === 'leagues' ? (
        filteredLeagues.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">No leagues found.</div>
        ) : (
          <div className="space-y-2">
            {filteredLeagues.map((l) => (
              <div
                key={l.id}
                onClick={() => setSelectedLeague(l)}
                className="group flex items-center justify-between p-3.5 bg-surface border border-surfaceLight/60 rounded-xl hover:border-slate-500 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                      {l.name}
                    </h4>
                    <span className="text-xs text-slate-400">{l.country}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FollowButton
                    entityType="league"
                    entityId={l.id}
                    entityName={l.name}
                  />
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-200 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredTeams.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">No teams found.</div>
      ) : (
        <div className="space-y-2">
          {filteredTeams.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTeamId(t.id)}
              className="group flex items-center justify-between p-3 bg-surface border border-surfaceLight/60 rounded-xl hover:border-slate-500 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {t.logo_url ? (
                  <img
                    src={t.logo_url}
                    alt=""
                    className="w-8 h-8 object-contain rounded-full bg-slate-900/50 p-0.5"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {t.short_name?.slice(0, 2) || 'T'}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                    {t.name}
                  </h4>
                  <span className="text-xs text-slate-400 font-semibold">{t.short_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FollowButton
                  entityType="team"
                  entityId={t.id}
                  entityName={t.name}
                />
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-200 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* League Detail Modal with Standings & Fixtures */}
      {selectedLeague && (
        <LeagueDetailModal
          leagueId={selectedLeague.id}
          leagueName={selectedLeague.name}
          country={selectedLeague.country}
          onClose={() => setSelectedLeague(null)}
          onSelectMatch={onSelectMatch}
          onSelectTeam={(teamId) => {
            setSelectedLeague(null)
            setSelectedTeamId(teamId)
          }}
        />
      )}

      {/* Team Detail Modal with Form & Matches */}
      {selectedTeamId && (
        <TeamDetailModal
          teamId={selectedTeamId}
          onClose={() => setSelectedTeamId(null)}
          onSelectMatch={onSelectMatch}
        />
      )}
    </div>
  )
}
