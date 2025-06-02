import Layout from "../components/layout"

export default function About() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              About AI Heroes of History
            </h1>
          </div>

          <div className="bg-gray-800 rounded-xl p-8 shadow-2xl">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg className="w-12 h-12 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              <p className="text-xl text-gray-300 leading-relaxed">
                Experimental project to familiarize myself with AI coding and development tools. I hope you enjoy it.
              </p>

              <div className="pt-8">
                <p className="text-lg text-gray-400 mb-2">Cheers,</p>
                <p className="text-2xl font-bold text-yellow-400 mb-4">Ariel Poler</p>
                <a
                  href="http://x.ariel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-yellow-400 hover:text-yellow-300 transition-colors duration-300 text-lg font-semibold"
                >
                  <span>@ariel</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Additional info section */}
          <div className="mt-8 bg-gray-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4 text-center">How It Works</h2>
            <div className="grid md:grid-cols-2 gap-6 text-gray-300">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-yellow-400">Ask Questions</h3>
                <p>
                  Record voice questions and get AI-powered responses from historical figures like Leonardo da Vinci,
                  Socrates, and more.
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-yellow-400">Watch Debates</h3>
                <p>
                  Select two historical figures and watch them engage in fascinating debates on topics ranging from
                  philosophy to art.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
