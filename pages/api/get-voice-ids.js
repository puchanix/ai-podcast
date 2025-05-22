// pages/api/get-voice-ids.js
export default async function handler(req, res) {
    try {
      // Return the voice IDs from environment variables
      const voiceIds = {
        eleonardo: process.env.ELEONARDO_VOICE_ID,
        socrates: process.env.SOCRATES_VOICE_ID,
        frida: process.env.FRIDA_VOICE_ID,
        shakespeare: process.env.SHAKESPEARE_VOICE_ID,
        mozart: process.env.MOZART_VOICE_ID,
      }
  
      // Log the voice IDs for debugging
      console.log("API returning voice IDs:", voiceIds)
  
      res.status(200).json(voiceIds)
    } catch (error) {
      console.error("Error getting voice IDs:", error)
      res.status(500).json({ error: "Failed to get voice IDs" })
    }
  }
  