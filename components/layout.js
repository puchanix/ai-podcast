"use client"

import { useState } from "react"

export default function Layout({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <a href="/">
                  <span className="font-bold text-slate-900">My App</span>
                </a>
              </div>
            </div>
            <div className="hidden md:flex items-center">
              <nav className="hidden md:flex space-x-8">
                <a href="/" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Home
                </a>
                <a href="/about" className="text-slate-600 hover:text-slate-900 transition-colors">
                  About
                </a>
                <a href="/feedback" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Feedback
                </a>
              </nav>
            </div>
            <div className="-mr-2 flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                type="button"
                className="bg-white inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg
                  className={`${isMenuOpen ? "hidden" : "block"} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <svg
                  className={`${isMenuOpen ? "block" : "hidden"} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className={`${isMenuOpen ? "block" : "hidden"} md:hidden`} id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="/" className="block px-3 py-2 text-slate-600 hover:text-slate-900 transition-colors">
              Home
            </a>
            <a href="/about" className="block px-3 py-2 text-slate-600 hover:text-slate-900 transition-colors">
              About
            </a>
            <a href="/feedback" className="block px-3 py-2 text-slate-600 hover:text-slate-900 transition-colors">
              Feedback
            </a>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</div>
      </main>

      <footer className="bg-white shadow mt-8">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-slate-500">
          &copy; {new Date().getFullYear()} My App. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
