// pages/api/get-voice-ids.js
// This API route will provide the voice IDs to the client

export default function handler(req, res) {
    // Return all environment variables that end with _VOICE_ID
    const voiceIds = {}
  
    // Get all environment variables
    Object.keys(process.env).forEach((key) => {
      // If the key ends with _VOICE_ID, add it to the response
      if (key.endsWith("_VOICE_ID")) {
        // Convert to the format expected by the client (remove _VOICE_ID suffix)
        const characterKey = key.replace("_VOICE_ID", "").toLowerCase()
        voiceIds[characterKey] = process.env[key]
      }
    })
  
    res.status(200).json(voiceIds)
  }
  