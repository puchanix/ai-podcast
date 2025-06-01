import { personaConfig } from "../../lib/personas.js"

export default function handler(req, res) {
  console.log("🔍 [GET-VOICE-IDS DEBUG] API called")

  try {
    // Dynamically build voice IDs from persona configuration
    const voiceIds = {}

    Object.values(personaConfig).forEach((persona) => {
      const envValue = process.env[persona.envVarName]
      voiceIds[persona.apiKey] = envValue || null

      console.log(`🔍 [GET-VOICE-IDS DEBUG] ${persona.name} (${persona.envVarName}):`, envValue || "NOT SET")
    })

    console.log("🔍 [GET-VOICE-IDS DEBUG] Generated voice IDs:", voiceIds)

    // Validate that we have at least some voice IDs
    const validVoiceIds = Object.values(voiceIds).filter((id) => id !== null)
    if (validVoiceIds.length === 0) {
      console.warn("🔍 [GET-VOICE-IDS DEBUG] WARNING: No voice IDs found in environment variables")
    }

    res.status(200).json(voiceIds)
  } catch (error) {
    console.error("🔍 [GET-VOICE-IDS DEBUG] Error:", error)
    res.status(500).json({ error: "Failed to get voice IDs", details: error.message })
  }
}
