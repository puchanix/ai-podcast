"use client"

import { DebateInterface } from "../components/debate-interface"
import { useEffect, useState } from "react"

// This prevents prerendering errors
export const config = {
  unstable_runtimeJS: true,
}

export default function DebatePage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <div>Loading debate interface...</div>
  }

  return <DebateInterface />
}
