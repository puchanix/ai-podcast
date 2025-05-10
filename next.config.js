"use client"

import { useEffect, useState } from "react"

// Create a placeholder component for server-side rendering
export default function TestRecording() {
  // This will only be rendered on the server or during static generation
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background-top to-background text-copy p-4 space-y-6">
      <h1 className="text-2xl font-bold">Audio Recording Test</h1>
      <p>Loading recording interface...</p>

      {/* Client-side only component will be loaded here */}
      <ClientSideRecorder />

      <div className="mt-8">
        <a href="/" className="text-blue-400 hover:underline">
          Back to Home
        </a>
      </div>
    </div>
  )
}

// This is a special pattern for client-only components in Next.js
function ClientSideRecorder() {
  const [Component, setComponent] = useState(null)

  useEffect(() => {
    // Only import the component on the client side
    import("../components/test-recording-client")
      .then((mod) => setComponent(() => mod.default))
      .catch((err) => console.error("Failed to load client component:", err))
  }, [])

  // Return null during server-side rendering
  return Component ? <Component /> : null
}
