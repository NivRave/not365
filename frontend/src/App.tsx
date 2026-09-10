import { useState, useEffect } from 'react'
import { Navbar, TabType } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { MatchDetailPage } from './pages/MatchDetailPage'
import { LeaguesPage } from './pages/LeaguesPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { useAuthStore } from './stores/authStore'

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('matches')
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const loadUser = useAuthStore((s) => s.loadUser)

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleSelectMatch = (id: string) => {
    setSelectedMatchId(id)
  }

  const handleBackToMatches = () => {
    setSelectedMatchId(null)
  }

  const handleSelectTab = (tab: TabType) => {
    setSelectedMatchId(null)
    setCurrentTab(tab)
  }

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col items-center">
      {/* Container max-w-lg for mobile-first PWA layout */}
      <div className="w-full max-w-lg min-h-screen flex flex-col px-4 pb-20 pt-4">
        {/* Top Header */}
        {!selectedMatchId && (
          <header className="flex items-center justify-between py-3 mb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">
                not<span className="text-primary">365</span>
              </h1>
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px] tracking-wider uppercase">
                PWA
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface border border-surfaceLight text-[11px] font-semibold text-slate-400">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              Live
            </div>
          </header>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1">
          {selectedMatchId ? (
            <MatchDetailPage
              matchId={selectedMatchId}
              onBack={handleBackToMatches}
            />
          ) : (
            <>
              {currentTab === 'matches' && (
                <HomePage onSelectMatch={handleSelectMatch} />
              )}
              {currentTab === 'leagues' && <LeaguesPage />}
              {currentTab === 'favorites' && <FavoritesPage />}
              {currentTab === 'settings' && <SettingsPage />}
              {currentTab === 'profile' && <ProfilePage />}
            </>
          )}
        </main>

        {/* Bottom Navigation */}
        <Navbar currentTab={currentTab} onSelectTab={handleSelectTab} />
      </div>
    </div>
  )
}
