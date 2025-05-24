export default function handler(req, res) {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" })
    }
  
    // Return the voice IDs from environment variables
    const voiceIds = {
      davinci: process.env.ELEONARDO_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
      socrates: process.env.SOCRATES_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
      frida: process.env.FRIDA_VOICE_ID || "pMsXgVXv3BLzUgSXRplE",
      shakespeare: process.env.SHAKESPEARE_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
      mozart: process.env.MOZART_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
    }
  
    console.log("🔍 Returning voice IDs:", voiceIds)
    res.status(200).json(voiceIds)
  }
  