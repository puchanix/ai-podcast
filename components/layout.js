import Head from "next/head"

export default function Layout({ children, title = "Heroes of History" }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Engage in debates with historical figures" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">H</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Heroes of History
                </h1>
              </div>
              <nav className="hidden md:flex space-x-6">
                <a href="/" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
                  Home
                </a>
                <a href="#about" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
                  About
                </a>
              </nav>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-white/60 backdrop-blur-sm border-t border-slate-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-slate-600">
              <p className="text-sm">© 2024 Heroes of History. Engage with the greatest minds in human history.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
