import Head from "next/head"
import Link from "next/link"

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
        <main className="flex-1">{children}</main>

        <footer className="bg-white/60 backdrop-blur-sm border-t border-slate-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-center space-x-8 mb-4">
              <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
                Home
              </Link>
              <Link href="/about" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
                About
              </Link>
              <Link href="/feedback" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
                Feedback
              </Link>
            </div>
            <div className="text-center text-slate-600">
              <p className="text-sm">© 2024 Heroes of History. Engage with the greatest minds in human history.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
