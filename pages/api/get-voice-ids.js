export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }
  
    try {
      const { text, voice = "echo" } = req.body
  
      console.log("🔍 [SPEAK API DEBUG] Received request:")
      console.log("🔍 [SPEAK API DEBUG] - text:", text ? text.substring(0, 50) + "..." : "MISSING")
      console.log("🔍 [SPEAK API DEBUG] - voice parameter:", voice)
      console.log("🔍 [SPEAK API DEBUG] - req.body:", req.body)
  
      if (!text) {
        console.error("🔍 [SPEAK API DEBUG] Missing text parameter")
        return res.status(400).json({ error: "Text is required" })
      }
  
      // Get the actual voice ID to use
      const voiceId = getVoiceId(voice)
      console.log("🔍 [SPEAK API DEBUG] - final voiceId:", voiceId)
  
      if (!process.env.ELEVENLABS_API_KEY) {
        console.error("🔍 [SPEAK API DEBUG] Missing ELEVENLABS_API_KEY")
        return res.status(500).json({ error: "ElevenLabs API key not configured" })
      }
  
      const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voiceId, {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      })
  
      if (!response.ok) {
        console.error("🔍 [SPEAK API DEBUG] ElevenLabs API error:", response.status)
        const errorText = await response.text()
        console.error("🔍 [SPEAK API DEBUG] Error details:", errorText)
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
      }
  
      const audioBuffer = await response.arrayBuffer()
      const audioBase64 = Buffer.from(audioBuffer).toString("base64")
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`
  
      console.log("🔍 [SPEAK API DEBUG] Successfully generated audio with voice:", voiceId)
      return res.status(200).json({ audioUrl })
    } catch (error) {
      console.error("🔍 [SPEAK API DEBUG] Speak API error:", error)
      return res.status(500).json({ error: "Failed to generate audio: " + error.message })
    }
  }
  
  // Fixed voice mapping function
  function getVoiceId(voice) {
    console.log("🔍 [SPEAK API DEBUG] getVoiceId called with:", voice)
  
    // If the voice is already a voice ID (long string), use it directly
    if (voice && voice.length > 10 && voice !== "echo" && voice !== "nova") {
      console.log("🔍 [SPEAK API DEBUG] Voice appears to be a voice ID, using directly:", voice)
      return voice
    }
  
    // Map character keys to environment variables
    const voiceMap = {
      echo: "21m00Tcm4TlvDq8ikWAM", // Default ElevenLabs voice
      nova: "pMsXgVXv3BLzUgSXRplE", // Another default voice
      davinci: process.env.ELEONARDO_VOICE_ID,
      socrates: process.env.SOCRATES_VOICE_ID,
      frida: process.env.FRIDA_VOICE_ID,
      shakespeare: process.env.SHAKESPEARE_VOICE_ID,
      mozart: process.env.MOZART_VOICE_ID,
    }
  
    const mappedVoice = voiceMap[voice]
  
    console.log("🔍 [SPEAK API DEBUG] Environment variables check:")
    console.log("🔍 [SPEAK API DEBUG] - ELEONARDO_VOICE_ID:", process.env.ELEONARDO_VOICE_ID ? "SET" : "NOT SET")
    console.log("🔍 [SPEAK API DEBUG] - SOCRATES_VOICE_ID:", process.env.SOCRATES_VOICE_ID ? "SET" : "NOT SET")
    console.log("🔍 [SPEAK API DEBUG] - FRIDA_VOICE_ID:", process.env.FRIDA_VOICE_ID ? "SET" : "NOT SET")
    console.log("🔍 [SPEAK API DEBUG] - SHAKESPEARE_VOICE_ID:", process.env.SHAKESPEARE_VOICE_ID ? "SET" : "NOT SET")
    console.log("🔍 [SPEAK API DEBUG] - MOZART_VOICE_ID:", process.env.MOZART_VOICE_ID ? "SET" : "NOT SET")
  
    if (mappedVoice) {
      console.log("🔍 [SPEAK API DEBUG] Found custom voice for", voice, ":", mappedVoice)
      return mappedVoice
    } else {
      console.log("🔍 [SPEAK API DEBUG] No custom voice found for", voice, ", using echo")
      return voiceMap.echo
    }
  }
  