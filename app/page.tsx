export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold text-white">Dinner Conversations</h1>
        <p className="text-xl text-slate-300">
          Have stimulating conversations with historical figures, fascinating fictional characters, and contemporary
          thought leaders.
        </p>
        <div className="pt-4">
          <div className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold">Coming Soon</div>
        </div>
        <p className="text-sm text-slate-400 pt-8">Voice-driven conversations • Multiple participants • Time travel</p>
      </div>
    </main>
  )
}
