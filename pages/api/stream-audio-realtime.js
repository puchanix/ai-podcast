export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }
  
    try {
      const { text, voice } = req.body
  
      if (!text) {
        return res.status(400).json({ error: "Text is required" })
      }
  
      // Use ElevenLabs for streaming audio generation with original quality
      const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voice + "/stream", {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1", // Reverted back to original quality model
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true,
          },
          output_format: "mp3_44100_128", // Reverted back to original quality
        }),
      })
  
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`)
      }
  
      // Set headers for streaming
      res.setHeader("Content-Type", "audio/mpeg")
      res.setHeader("Transfer-Encoding", "chunked")
      res.setHeader("Cache-Control", "no-cache")
  
      // Stream the audio data
      const reader = response.body.getReader()
  
      while (true) {
        const { done, value } = await reader.read()
  
        if (done) {
          break
        }
  
        res.write(value)
      }
  
      res.end()
    } catch (error) {
      console.error("Error in streaming audio:", error)
      res.status(500).json({ error: "Failed to generate streaming audio" })
    }
  }
  