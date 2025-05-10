import dynamic from "next/dynamic"

// Create a client-only component with no SSR
const TestRecordingClient = dynamic(() => import("../components/test-recording-client"), {
  ssr: false,
})

export default function TestRecording() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background-top to-background text-copy p-4 space-y-6">
      <h1 className="text-2xl font-bold">Audio Recording Test</h1>
      <p>Loading recording interface...</p>

      <TestRecordingClient />

      <div className="mt-8">
        <a href="/" className="text-blue-400 hover:underline">
          Back to Home
        </a>
      </div>
    </div>
  )
}
