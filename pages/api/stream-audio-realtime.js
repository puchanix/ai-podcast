export default async function handler(req, res) {
    // Handle both GET and POST requests
    if (req.method !== "GET" && req.method !== "POST" && req.method !== "HEAD") {
      return res.status(405).json({ error: "Method not allowed" })
    }
  
    // Handle HEAD requests for URL testing
    if (req.method === "HEAD") {
      res.status(200).end()
      return
    }
  
    try {
      let text, voice, id
  
      // Extract parameters from query string for GET requests or body for POST
      if (req.method === "GET") {
        text = req.query.text
        voice = req.query.voice
        id = req.query.id
      } else {
        text = req.body.text
        voice = req.body.voice
        id = req.body.id
      }
  
      console.log("🔍 stream-audio-realtime called:", { method: req.method, text: text?.substring(0, 50), voice, id })
  
      if (!text || !voice) {
        return res.status(400).json({ error: "Missing text or voice parameter" })
      }
  
      // Set headers for audio streaming
      res.setHeader("Content-Type", "audio/mpeg")
      res.setHeader("Cache-Control", "no-cache")
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  
      // Generate audio using ElevenLabs
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`, {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      })
  
      if (!response.ok) {
        console.error("ElevenLabs API error:", response.status, response.statusText)
        return res.status(500).json({ error: "Failed to generate audio" })
      }
  
      // Stream the audio data directly to the client
      const reader = response.body.getReader()
  
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
  
      res.end()
    } catch (error) {
      console.error("Error in stream-audio-realtime:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
  