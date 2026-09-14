import React, { useEffect, useState, useMemo } from 'react'
import { useMatchStore } from '../stores/matchStore'
import { useAuthStore } from '../stores/authStore'
import { MatchCard } from '../components/MatchCard'
import { Sport, MatchEvent } from '../lib/types'
import { simulateMatch } from '../lib/api'
import { RefreshCw, Search, X, Star, Zap } from 'lucide-react'

interface HomePageProps {
  onSelectMatch: (id: string) => void
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectMatch }) => {
  const matches = useMatchStore((s) => s.matches)
  const activeSport = useMatchStore((s) => s.activeSport)
  const setSport = useMatchStore((s) => s.setSport)
  const statusFilter = useMatchStore((s) => s.statusFilter)
  const setStatusFilter = useMatchStore((s) => s.setStatusFilter)
  const dateFilter = useMatchStore((s) => s.dateFilter)
  const setDateFilter = useMatchStore((s) => s.setDateFilter)
  const favoritesOnly = useMatchStore((s) => s.favoritesOnly)
  const setFavoritesOnly = useMatchStore((s) => s.setFavoritesOnly)
  const loadMatches = useMatchStore((s) => s.loadMatches)
  const isLoading = useMatchStore((s) => s.isLoading)
  const updateMatchFromSSE = useMatchStore((s) => s.updateMatchFromSSE)

  const follows = useAuthStore((s) => s.follows)
  const followedIds = useMemo(() => new Set(follows.map((f) => f.entity_id)), [follows])

  const [search, setSearch] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)

  useEffect(() => {
    loadMatches()
  }, [loadMatches, activeSport, statusFilter, dateFilter])

  const sports: { id: Sport; label: string; icon: string }[] = [
    { id: 'football', label: 'Football', icon: '⚽' },
    { id: 'basketball', label: 'Basketball', icon: '🏀' },
    { id: 'mma', label: 'MMA / UFC', icon: '🥊' },
  ]

  // Date strip generation: Yesterday, Today, Tomorrow, + Next 5 Days
  const dateItems = useMemo(() => {
    const items = [
      { id: 'yesterday', label: 'Yesterday', sub: 'Past' },
      { id: 'today', label: 'Today', sub: 'Live & Sched' },
      { id: 'tomorrow', label: 'Tomorrow', sub: 'Upcoming' },
      { id: 'upcoming_7d', label: 'Next 7 Days', sub: 'Fixtures' },
      { id: 'all', label: 'All Dates', sub: 'Full' },
    ]
    return items
  }, [])

  // Filter matches in memory for search and favorites-only
  const filteredMatches = useMemo(() => {
    return matches.filter((m: MatchEvent) => {
      // Favorites only filter
      if (favoritesOnly) {
        const isFollowed =
          followedIds.has(m.home_team.id) ||
          followedIds.has(m.away_team.id) ||
          followedIds.has(m.league_id)
        if (!isFollowed) return false
      }

      // Search query filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const homeMatch = m.home_team.name.toLowerCase().includes(q)
        const awayMatch = m.away_team.name.toLowerCase().includes(q)
        const leagueMatch = m.league_name.toLowerCase().includes(q)
        if (!homeMatch && !awayMatch && !leagueMatch) return false
      }

      return true
    })
  }, [matches, favoritesOnly, followedIds, search])

  // Group filtered matches by league
  const leaguesMap = useMemo(() => {
    return filteredMatches.reduce((acc, match) => {
      const key = match.league_name || 'Other'
      if (!acc[key]) acc[key] = []
      acc[key].push(match)
      return acc
    }, {} as Record<string, typeof matches>)
  }, [filteredMatches])

  const liveCount = matches.filter(
    (m) => m.status === 'live' || m.status === 'halftime'
  ).length

  const handleSimulate = async () => {
    setIsSimulating(true)
    try {
      const sim = await simulateMatch()
      updateMatchFromSSE(sim)
      onSelectMatch(sim.id)
    } catch (e) {
      console.error('Simulation error:', e)
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <div className="space-y-3.5">
      {/* Sport Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {sports.map((s) => {
          const isActive = activeSport === s.id
          return (
            <button
              key={s.id}
              onClick={() => setSport(s.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-slate-900 shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-surface border border-surfaceLight text-slate-300 hover:text-white'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Date Filter Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {dateItems.map((item) => {
          const isActive = dateFilter === item.id
          return (
            <button
              key={item.id}
              onClick={() => setDateFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex flex-col items-center leading-tight ${
                isActive
                  ? 'bg-slate-700 text-white border border-primary/50 shadow-sm'
                  : 'bg-surface/70 border border-surfaceLight/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{item.label}</span>
              <span className="text-[9px] opacity-70 font-normal">{item.sub}</span>
            </button>
          )
        })}
      </div>

      {/* Status Filter Chips & Favorites Toggle Bar */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            {
              id: 'live',
              label: (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping"></span>
                  Live {liveCount > 0 ? `(${liveCount})` : ''}
                </span>
              ),
            },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'finished', label: 'Finished' },
          ].map((chip) => {
            const isActive = statusFilter === chip.id
            return (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-200 text-slate-950 shadow-sm'
                    : 'bg-surface border border-surfaceLight/60 text-slate-400 hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        {/* Favorites Only Switch */}
        <button
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
            favoritesOnly
              ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/40 shadow-sm shadow-yellow-400/10'
              : 'bg-surface border-surfaceLight/60 text-slate-400 hover:text-slate-200'
          }`}
          title="Filter matches by your followed teams & leagues"
        >
          <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-current' : ''}`} />
          <span>Favorites</span>
        </button>
      </div>

      {/* Search Bar & Live Simulator CTA */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams, leagues..."
            className="w-full bg-surface border border-surfaceLight/70 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
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

        {/* Live Simulator Button */}
        <button
          onClick={handleSimulate}
          disabled={isSimulating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-accent/90 to-primary/90 text-slate-950 text-xs font-black shadow-md shadow-accent/10 hover:brightness-110 active:scale-95 transition-all flex-shrink-0"
          title="Simulate a live thriller with real-time SSE updates & goal chime"
        >
          <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isSimulating ? 'Starting...' : 'Live Sim'}</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={() => loadMatches()}
          disabled={isLoading}
          className="p-2 rounded-xl bg-surface border border-surfaceLight/70 text-slate-400 hover:text-white transition-colors flex-shrink-0"
          title="Refresh matches"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Favorites Banner Warning when enabled but no follows */}
      {favoritesOnly && follows.length === 0 && (
        <div className="p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-xl text-center">
          <p className="text-xs text-yellow-300 font-semibold mb-1">No favorites saved yet</p>
          <p className="text-[11px] text-slate-400">
            Tap the star icon next to any team or league to add it to your favorites.
          </p>
        </div>
      )}

      {/* Match List Grouped by League */}
      {isLoading && matches.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Loading matches...</p>
        </div>
      ) : Object.keys(leaguesMap).length === 0 ? (
        <div className="text-center py-16 bg-surface/50 border border-surfaceLight/50 rounded-2xl p-6 space-y-2">
          <p className="text-slate-300 font-bold text-sm">No matches match your criteria</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Try switching date to &quot;Next 7 Days&quot; or changing the status filter to &quot;All&quot;.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setStatusFilter('all')
                setDateFilter('upcoming_7d')
                setFavoritesOnly(false)
                setSearch('')
              }}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-slate-900 text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(leaguesMap).map(([leagueName, leagueMatches]) => (
            <div key={leagueName} className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {leagueName}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {leagueMatches.length} games
                </span>
              </div>

              <div className="space-y-2">
                {leagueMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    onClick={() => onSelectMatch(m.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
