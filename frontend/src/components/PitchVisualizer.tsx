import React, { useState, useMemo } from 'react'
import { MatchLineups, TeamLineup, LineupPlayer, Sport } from '../lib/types'
import { Shield, Users, UserCheck } from 'lucide-react'

interface PitchVisualizerProps {
  lineups: MatchLineups
  homeTeamName?: string
  awayTeamName?: string
  sport?: Sport
}

type ViewMode = 'both' | 'home' | 'away'

export const PitchVisualizer: React.FC<PitchVisualizerProps> = ({
  lineups,
  homeTeamName = 'Home Team',
  awayTeamName = 'Away Team',
  sport = 'football'
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('both')
  const [selectedPlayer, setSelectedPlayer] = useState<LineupPlayer | null>(null)

  const isBasketball = sport === 'basketball'

  // Helper to calculate coordinates for players in a team lineup
  const calculateCoordinates = (team: TeamLineup, isAway: boolean, mode: ViewMode) => {
    // Group players by row
    const rowMap = new Map<number, LineupPlayer[]>()

    team.starting_xi.forEach((p) => {
      let r = 1
      if (p.grid) {
        const parts = p.grid.split(':')
        r = parseInt(parts[0], 10) || 1
      } else {
        // Fallback by position
        const pos = p.position.toUpperCase()
        if (pos === 'GK') r = 1
        else if (pos === 'DF' || pos === 'CB' || pos === 'LB' || pos === 'RB') r = 2
        else if (pos === 'MF' || pos === 'CM' || pos === 'DM' || pos === 'AM' || pos === 'LM' || pos === 'RM') r = 3
        else if (pos === 'FW' || pos === 'ST' || pos === 'CF' || pos === 'LW' || pos === 'RW') r = 4
        else if (isBasketball) {
          if (pos === 'PG' || pos === 'SG') r = 1
          else if (pos === 'SF') r = 2
          else r = 3
        }
      }
      const list = rowMap.get(r) || []
      list.push(p)
      rowMap.set(r, list)
    })

    const positions: { player: LineupPlayer; x: number; y: number }[] = []

    rowMap.forEach((playersInRow, rowNum) => {
      const count = playersInRow.length
      playersInRow.forEach((player, colIdx) => {
        const x = ((colIdx + 1) / (count + 1)) * 100

        let y = 50
        if (mode === 'both') {
          if (!isAway) {
            // Home occupies bottom half: y from 53% to 92%
            // Row 1 (GK) at ~91%, Row 4 (FW) at ~53%
            const maxRow = Math.max(...Array.from(rowMap.keys()), 4)
            const minRow = 1
            const factor = maxRow === minRow ? 0 : (rowNum - minRow) / (maxRow - minRow)
            y = 90 - factor * 37
          } else {
            // Away occupies top half: y from 9% to 47%
            // Row 1 (GK) at ~10%, Row 4 (FW) at ~47%
            const maxRow = Math.max(...Array.from(rowMap.keys()), 4)
            const minRow = 1
            const factor = maxRow === minRow ? 0 : (rowNum - minRow) / (maxRow - minRow)
            y = 10 + factor * 37
          }
        } else {
          // Single team mode: attacks upward (GK bottom, FW top)
          const maxRow = Math.max(...Array.from(rowMap.keys()), 4)
          const minRow = 1
          const factor = maxRow === minRow ? 0 : (rowNum - minRow) / (maxRow - minRow)
          y = 86 - factor * 68
        }

        positions.push({ player, x, y })
      })
    })

    return positions
  }

  const homeCoords = useMemo(() => calculateCoordinates(lineups.home, false, viewMode), [lineups.home, viewMode])
  const awayCoords = useMemo(() => calculateCoordinates(lineups.away, true, viewMode), [lineups.away, viewMode])

  const getRatingColor = (rating?: number) => {
    if (!rating) return 'bg-surface-light text-text-secondary border-border'
    if (rating >= 8.0) return 'bg-emerald-600 text-white border-emerald-500'
    if (rating >= 7.0) return 'bg-emerald-500/90 text-white border-emerald-400'
    if (rating >= 6.0) return 'bg-amber-500 text-white border-amber-400'
    return 'bg-red-500 text-white border-red-400'
  }

  const activeTeamName = viewMode === 'away' ? awayTeamName : homeTeamName

  return (
    <div className="space-y-6">
      {/* View Mode Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm text-text-primary">Pitch Formations</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {lineups.home.formation || '4-3-3'} vs {lineups.away.formation || '4-2-3-1'}
          </span>
        </div>

        <div className="flex items-center bg-surface-light rounded-lg p-1 border border-border w-full sm:w-auto justify-center">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'both'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Full Pitch
          </button>
          <button
            onClick={() => setViewMode('home')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'home'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {homeTeamName} ({lineups.home.formation || 'XI'})
          </button>
          <button
            onClick={() => setViewMode('away')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'away'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {awayTeamName} ({lineups.away.formation || 'XI'})
          </button>
        </div>
      </div>

      {/* The Visual Pitch */}
      <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700/60 bg-emerald-900 select-none">
        {/* Pitch Graphic Background (SVG) */}
        <div className="relative w-full aspect-[3/4.4]">
          {isBasketball ? (
            /* Basketball Court Pattern */
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 440" preserveAspectRatio="none">
              <defs>
                <linearGradient id="woodFloor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c27d38" />
                  <stop offset="50%" stopColor="#b36e2b" />
                  <stop offset="100%" stopColor="#c27d38" />
                </linearGradient>
              </defs>
              {/* Hardwood */}
              <rect width="300" height="440" fill="url(#woodFloor)" />
              {/* Outer boundary */}
              <rect x="15" y="15" width="270" height="410" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" />
              {/* Half court line */}
              <line x1="15" y1="220" x2="285" y2="220" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
              {/* Center Circle */}
              <circle cx="150" cy="220" r="30" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
              {/* Top Key & 3pt */}
              <rect x="100" y="15" width="100" height="95" fill="rgba(0,0,0,0.08)" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
              <circle cx="150" cy="110" r="30" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 40,15 L 40,55 A 110,110 0 0,0 260,55 L 260,15" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
              {/* Bottom Key & 3pt */}
              <rect x="100" y="330" width="100" height="95" fill="rgba(0,0,0,0.08)" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
              <circle cx="150" cy="330" r="30" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 40,425 L 40,385 A 110,110 0 0,1 260,385 L 260,425" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
            </svg>
          ) : (
            /* Football Pitch Pattern */
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 440" preserveAspectRatio="none">
              <defs>
                <pattern id="grassStripes" width="300" height="44" patternUnits="userSpaceOnUse">
                  <rect width="300" height="22" fill="#15803d" />
                  <rect y="22" width="300" height="22" fill="#166534" />
                </pattern>
              </defs>
              {/* Turf Grass Stripes */}
              <rect width="300" height="440" fill="url(#grassStripes)" />
              {/* Outer boundary */}
              <rect x="15" y="15" width="270" height="410" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" rx="3" />
              {/* Halfway line */}
              <line x1="15" y1="220" x2="285" y2="220" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
              {/* Center circle */}
              <circle cx="150" cy="220" r="40" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
              {/* Center spot */}
              <circle cx="150" cy="220" r="2.5" fill="rgba(255,255,255,0.85)" />

              {/* Top Penalty Area (Away) */}
              <rect x="65" y="15" width="170" height="66" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
              {/* Top Goal Area */}
              <rect x="105" y="15" width="90" height="22" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
              {/* Top Penalty Spot */}
              <circle cx="150" cy="55" r="2.5" fill="rgba(255,255,255,0.85)" />
              {/* Top Penalty Arc */}
              <path d="M 125,81 A 30,30 0 0,0 175,81" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />

              {/* Bottom Penalty Area (Home) */}
              <rect x="65" y="359" width="170" height="66" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
              {/* Bottom Goal Area */}
              <rect x="105" y="403" width="90" height="22" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
              {/* Bottom Penalty Spot */}
              <circle cx="150" cy="385" r="2.5" fill="rgba(255,255,255,0.85)" />
              {/* Bottom Penalty Arc */}
              <path d="M 125,359 A 30,30 0 0,1 175,359" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />

              {/* Corner arcs */}
              <path d="M 15,25 A 10,10 0 0,0 25,15" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
              <path d="M 275,15 A 10,10 0 0,0 285,25" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
              <path d="M 15,415 A 10,10 0 0,1 25,425" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
              <path d="M 275,425 A 10,10 0 0,1 285,415" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
            </svg>
          )}

          {/* Team Name Watermarks on Pitch */}
          {viewMode === 'both' ? (
            <>
              <div className="absolute top-4 left-6 text-white/20 font-black text-xl tracking-wider uppercase pointer-events-none">
                {awayTeamName}
              </div>
              <div className="absolute bottom-4 left-6 text-white/20 font-black text-xl tracking-wider uppercase pointer-events-none">
                {homeTeamName}
              </div>
            </>
          ) : (
            <div className="absolute top-4 left-6 text-white/20 font-black text-2xl tracking-wider uppercase pointer-events-none">
              {activeTeamName}
            </div>
          )}

          {/* Render Home Players */}
          {(viewMode === 'both' || viewMode === 'home') &&
            homeCoords.map(({ player, x, y }) => (
              <div
                key={player.id}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group z-10 transition-transform duration-200 hover:scale-110"
                onClick={() => setSelectedPlayer(player)}
              >
                {/* Jersey Node */}
                <div className="relative">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-red-400 border-2 border-white shadow-md flex items-center justify-center text-white font-extrabold text-xs sm:text-sm">
                    {player.number}
                  </div>
                  {/* Captain Indicator */}
                  {player.is_captain && (
                    <span className="absolute -top-1 -right-1.5 bg-amber-400 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white shadow">
                      C
                    </span>
                  )}
                  {/* Rating Tag */}
                  {player.rating && (
                    <span
                      className={`absolute -bottom-1 -right-1 text-[9px] font-bold px-1 rounded-sm border shadow-xs leading-none ${getRatingColor(
                        player.rating
                      )}`}
                    >
                      {player.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Player Name Pill */}
                <div className="mt-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] sm:text-[11px] font-medium text-white max-w-[84px] truncate text-center shadow">
                  {player.name}
                </div>
              </div>
            ))}

          {/* Render Away Players */}
          {(viewMode === 'both' || viewMode === 'away') &&
            awayCoords.map(({ player, x, y }) => (
              <div
                key={player.id}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group z-10 transition-transform duration-200 hover:scale-110"
                onClick={() => setSelectedPlayer(player)}
              >
                {/* Jersey Node */}
                <div className="relative">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 border-2 border-white shadow-md flex items-center justify-center text-white font-extrabold text-xs sm:text-sm">
                    {player.number}
                  </div>
                  {/* Captain Indicator */}
                  {player.is_captain && (
                    <span className="absolute -top-1 -right-1.5 bg-amber-400 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white shadow">
                      C
                    </span>
                  )}
                  {/* Rating Tag */}
                  {player.rating && (
                    <span
                      className={`absolute -bottom-1 -right-1 text-[9px] font-bold px-1 rounded-sm border shadow-xs leading-none ${getRatingColor(
                        player.rating
                      )}`}
                    >
                      {player.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Player Name Pill */}
                <div className="mt-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] sm:text-[11px] font-medium text-white max-w-[84px] truncate text-center shadow">
                  {player.name}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Selected Player Detail Modal / Card */}
      {selectedPlayer && (
        <div className="bg-surface p-4 rounded-xl border border-primary/40 shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary border border-primary/40 flex items-center justify-center font-black text-lg">
              #{selectedPlayer.number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-text-primary">{selectedPlayer.name}</span>
                {selectedPlayer.is_captain && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 uppercase">
                    Captain
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded bg-surface-light text-text-secondary font-semibold">
                  {selectedPlayer.position}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Grid: {selectedPlayer.grid || 'Standard'} • Status: Starting Lineup
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {selectedPlayer.rating && (
              <div className="text-right">
                <div className="text-xs text-text-secondary font-medium">Match Rating</div>
                <div className="text-lg font-black text-emerald-400">{selectedPlayer.rating.toFixed(1)}</div>
              </div>
            )}
            <button
              onClick={() => setSelectedPlayer(null)}
              className="text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded bg-surface-light border border-border"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Team Coaches & Tactics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-primary" />
              <div>
                <span className="text-xs text-text-secondary font-medium">{homeTeamName} Manager</span>
                <p className="font-semibold text-sm text-text-primary">{lineups.home.coach || 'Head Coach'}</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-surface-light border border-border font-bold text-primary">
              {lineups.home.formation || '4-3-3'}
            </span>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-xs text-text-secondary font-medium">{awayTeamName} Manager</span>
                <p className="font-semibold text-sm text-text-primary">{lineups.away.coach || 'Head Coach'}</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-surface-light border border-border font-bold text-cyan-400">
              {lineups.away.formation || '4-2-3-1'}
            </span>
          </div>
        </div>
      </div>

      {/* Substitutes Section */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-text-secondary" />
          <h3 className="font-semibold text-sm text-text-primary">Substitutes Bench</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Home Substitutes */}
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{homeTeamName}</span>
              <span className="text-[10px] text-text-muted">{lineups.home.substitutes.length} players</span>
            </h4>
            <div className="space-y-1.5">
              {lineups.home.substitutes.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => setSelectedPlayer(sub)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-light hover:bg-surface-light/80 border border-border transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-text-secondary w-5">#{sub.number}</span>
                    <span className="text-sm font-medium text-text-primary">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary">
                      {sub.position}
                    </span>
                    {sub.rating && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getRatingColor(sub.rating)}`}>
                        {sub.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Away Substitutes */}
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{awayTeamName}</span>
              <span className="text-[10px] text-text-muted">{lineups.away.substitutes.length} players</span>
            </h4>
            <div className="space-y-1.5">
              {lineups.away.substitutes.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => setSelectedPlayer(sub)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-light hover:bg-surface-light/80 border border-border transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-text-secondary w-5">#{sub.number}</span>
                    <span className="text-sm font-medium text-text-primary">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary">
                      {sub.position}
                    </span>
                    {sub.rating && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getRatingColor(sub.rating)}`}>
                        {sub.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
