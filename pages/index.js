"use client"

import { useState } from "react"
import Layout from "../components/layout"
import DebateInterface from "../components/debate-interface"

const heroes = [
  {
    id: "leonardo",
    name: "Leonardo da Vinci",
    period: "1452-1519",
    description: "Renaissance polymath, artist, inventor, and scientist",
    expertise: "Art, Science, Engineering, Anatomy",
    avatar: "/da-vinci-renaissance-portrait.png",
    color: "from-amber-500 to-orange-600",
    bgColor: "from-amber-50 to-orange-50",
  },
  {
    id: "socrates",
    name: "Socrates",
    period: "470-399 BCE",
    description: "Classical Greek philosopher, founder of Western philosophy",
    expertise: "Philosophy, Ethics, Logic, Dialectic Method",
    avatar: "/placeholder.svg?height=120&width=120&query=Socrates ancient Greek philosopher",
    color: "from-blue-500 to-indigo-600",
    bgColor: "from-blue-50 to-indigo-50",
  },
  {
    id: "frida",
    name: "Frida Kahlo",
    period: "1907-1954",
    description: "Mexican artist known for self-portraits and surrealism",
    expertise: "Painting, Self-expression, Mexican Culture, Feminism",
    avatar: "/placeholder.svg?height=120&width=120&query=Frida Kahlo Mexican artist colorful",
    color: "from-rose-500 to-pink-600",
    bgColor: "from-rose-50 to-pink-50",
  },
  {
    id: "shakespeare",
    name: "William Shakespeare",
    period: "1564-1616",
    description: "English playwright and poet, greatest writer in English",
    expertise: "Literature, Drama, Poetry, Human Nature",
    avatar: "/placeholder.svg?height=120&width=120&query=William Shakespeare Elizabethan playwright",
    color: "from-purple-500 to-violet-600",
    bgColor: "from-purple-50 to-violet-50",
  },
  {
    id: "mozart",
    name: "Wolfgang Amadeus Mozart",
    period: "1756-1791",
    description: "Austrian composer of the Classical period",
    expertise: "Music Composition, Piano, Opera, Symphony",
    avatar: "/placeholder.svg?height=120&width=120&query=Mozart classical composer 18th century",
    color: "from-emerald-500 to-teal-600",
    bgColor: "from-emerald-50 to-teal-50",
  },
]

export default function Home() {
  const [selectedHero, setSelectedHero] = useState(null)

  if (selectedHero) {
    return (
      <Layout title={`Debate with ${selectedHero.name}`}>
        <DebateInterface hero={selectedHero} onBack={() => setSelectedHero(null)} />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-6">
            Debate with History's Greatest Minds
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Engage in thought-provoking conversations with legendary figures from across time. Challenge their ideas,
            learn from their wisdom, and explore the depths of human knowledge.
          </p>
        </div>

        {/* Heroes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {heroes.map((hero) => (
            <div
              key={hero.id}
              onClick={() => setSelectedHero(hero)}
              className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
            >
              <div
                className={`bg-gradient-to-br ${hero.bgColor} rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/50 backdrop-blur-sm`}
              >
                {/* Avatar */}
                <div className="flex justify-center mb-6">
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${hero.color} p-1 shadow-lg`}>
                    <img
                      src={hero.avatar || "/placeholder.svg"}
                      alt={hero.name}
                      className="w-full h-full rounded-full object-cover bg-white"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                    {hero.name}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mb-3 tracking-wide">{hero.period}</p>
                  <p className="text-slate-600 mb-4 leading-relaxed">{hero.description}</p>

                  {/* Expertise Tags */}
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {hero.expertise.split(", ").map((skill, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r ${hero.color} text-white shadow-sm`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <div
                    className={`inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r ${hero.color} text-white font-semibold shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-1`}
                  >
                    <span>Start Debate</span>
                    <svg
                      className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">AI-Powered Conversations</h3>
            <p className="text-slate-600">
              Experience realistic debates powered by advanced AI that captures each figure's unique perspective and
              knowledge.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Historical Accuracy</h3>
            <p className="text-slate-600">
              Each conversation is grounded in historical facts and the documented thoughts and philosophies of these
              great minds.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Learn & Explore</h3>
            <p className="text-slate-600">
              Discover new perspectives on timeless questions and deepen your understanding of history, philosophy, and
              human nature.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
