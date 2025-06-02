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
                <p className="text-lg font-bold text-yellow-400 mb-4">Ariel Poler</p>
                <a
                  href="https://x.com/ariel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors duration-300 font-semibold"
                >
                  @ariel
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
