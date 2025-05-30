export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }
  
    try {
      const { text, voice } = req.body
  
      if (!text) {
        return res.status(400).json({ error: "Text is required" })
      }
  
      console.log("🎵 [FAST SPEAK] Generating audio for:", text.substring(0, 50) + "...")
      const startTime = Date.now()
  
      // Use faster ElevenLabs settings
      const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + (voice || "echo"), {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_turbo_v2", // Fastest model
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: false, // Disable for speed
          },
          optimize_streaming_latency: 4, // Maximum optimization
          output_format: "mp3_22050_32", // Lower quality for speed
        }),
      })
  
      if (!response.ok) {
        const errorText = await response.text()
        console.error("🎵 [FAST SPEAK] ElevenLabs error:", errorText)
        throw new Error(`ElevenLabs API error: ${response.status}`)
      }
  
      const audioBuffer = await response.arrayBuffer()
      const audioBase64 = Buffer.from(audioBuffer).toString("base64")
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`
  
      const endTime = Date.now()
      console.log("🎵 [FAST SPEAK] Audio generated in:", endTime - startTime + "ms")
  
      res.status(200).json({ audioUrl })
    } catch (error) {
      console.error("🎵 [FAST SPEAK] Error:", error)
      res.status(500).json({ error: error.message })
    }
  }
  