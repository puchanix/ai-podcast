export const config = {
    api: {
      responseLimit: false,
    },
  }
  
  async function handler(req, res) {
    if (req.method === "GET") {
      try {
        const { text, voice, id } = req.query
  
        if (!text || !voice) {
          return res.status(400).json({ error: "Missing text or voice parameter" })
        }
  
        console.log("🔍 Generating audio for:", { text: text.substring(0, 50) + "...", voice, id })
  
        // Generate audio using ElevenLabs
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`, {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: decodeURIComponent(text),
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        })
  
        if (!response.ok) {
          console.error("🔍 ElevenLabs API error:", response.status, response.statusText)
          return res.status(500).json({ error: "Failed to generate audio" })
        }
  
        // Set headers for audio streaming
        res.setHeader("Content-Type", "audio/mpeg")
        res.setHeader("Cache-Control", "no-cache")
        res.setHeader("Access-Control-Allow-Origin", "*")
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  
        // Stream the audio response
        const reader = response.body.getReader()
  
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(value)
          }
          res.end()
        } catch (streamError) {
          console.error("🔍 Streaming error:", streamError)
          res.status(500).json({ error: "Streaming failed" })
        }
      } catch (error) {
        console.error("🔍 Error in stream-audio-realtime:", error)
        res.status(500).json({ error: "Internal server error" })
      }
    } else if (req.method === "POST") {
      // Keep the existing POST functionality for compatibility
      try {
        const audioBufferChunks = []
        let totalLength = 0
  
        req.on("data", (chunk) => {
          audioBufferChunks.push(chunk)
          totalLength += chunk.length
        })
  
        req.on("end", async () => {
          try {
            const completeAudioBuffer = Buffer.concat(audioBufferChunks, totalLength)
  
            res.setHeader("Content-Type", "audio/mpeg")
            res.setHeader("Content-Length", completeAudioBuffer.length)
            res.setHeader("Cache-Control", "no-cache")
            res.setHeader("Connection", "keep-alive")
            res.setHeader("Transfer-Encoding", "chunked")
  
            res.write(completeAudioBuffer)
            res.end()
          } catch (concatError) {
            console.error("Error concatenating audio buffers:", concatError)
            res.status(500).json({ error: "Failed to process audio data." })
          }
        })
  
        req.on("error", (error) => {
          console.error("Request error:", error)
          res.status(400).json({ error: "Bad request." })
        })
      } catch (error) {
        console.error("Error processing request:", error)
        res.status(500).json({ error: "Internal server error." })
      }
    } else if (req.method === "HEAD") {
      // Handle HEAD requests for audio URL testing
      res.setHeader("Content-Type", "audio/mpeg")
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.status(200).end()
    } else if (req.method === "OPTIONS") {
      // Handle CORS preflight requests
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type")
      res.status(200).end()
    } else {
      res.status(405).json({ error: "Method not allowed" })
    }
  }
  
  export default handler
  