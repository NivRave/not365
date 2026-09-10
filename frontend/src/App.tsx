export default function App() {
  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface border border-surfaceLight rounded-2xl p-6 text-center shadow-xl">
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">
          not<span className="text-primary">365</span>
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Real-Time Multi-Sport Live Scores & Schedules
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
          System Online
        </div>
      </div>
    </div>
  )
}
