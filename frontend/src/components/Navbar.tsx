import React from 'react'
import { Trophy, Compass, Star, Settings, User as UserIcon } from 'lucide-react'

export type TabType = 'matches' | 'leagues' | 'favorites' | 'settings' | 'profile'

interface NavbarProps {
  currentTab: TabType
  onSelectTab: (tab: TabType) => void
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'matches' as TabType, label: 'Scores', icon: Trophy },
    { id: 'leagues' as TabType, label: 'Leagues', icon: Compass },
    { id: 'favorites' as TabType, label: 'Following', icon: Star },
    { id: 'settings' as TabType, label: 'Alerts', icon: Settings },
    { id: 'profile' as TabType, label: 'Account', icon: UserIcon },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-surfaceLight max-w-lg mx-auto pb-safe">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-primary font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
