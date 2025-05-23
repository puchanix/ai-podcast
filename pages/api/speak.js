// pages/api/speak.js

export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }
  
    const { text, voice } = req.body
  
    if (!text) {
      return res.status(400).json({ error: "Text is required" })
    }
  
    try {
      console.log(`Generating audio for text: ${text.substring(0, 50)}...`)
      console.log(`Using voice: ${voice}`)
  
      // Check if it's an ElevenLabs voice ID (longer than typical OpenAI voice names)
      const isElevenLabsVoice = voice && voice.length > 10
  
      if (isElevenLabsVoice && process.env.ELEVENLABS_API_KEY) {
        console.log("Using ElevenLabs voice:", voice)
  
        // Use ElevenLabs API
        const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
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
  
        if (!elevenLabsResponse.ok) {
          console.error("ElevenLabs API error:", elevenLabsResponse.status, elevenLabsResponse.statusText)
          throw new Error(`ElevenLabs API error: ${elevenLabsResponse.status}`)
        }
  
        // Get the audio data as array buffer
        const audioBuffer = await elevenLabsResponse.arrayBuffer()
  
        // Convert to base64 for data URL
        const audioBase64 = Buffer.from(audioBuffer).toString("base64")
        const audioUrl = `data:audio/mpeg;base64,${audioBase64}`
  
        return res.status(200).json({ audioUrl })
      } else {
        console.log("Using OpenAI voice:", voice || "alloy")
  
        // Use OpenAI TTS API
        const openaiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "tts-1", // Use faster model for reduced latency
            input: text,
            voice: voice || "alloy",
            response_format: "mp3",
            speed: 1.0,
          }),
        })
  
        if (!openaiResponse.ok) {
          console.error("OpenAI TTS API error:", openaiResponse.status, openaiResponse.statusText)
          throw new Error(`OpenAI TTS API error: ${openaiResponse.status}`)
        }
  
        // Get the audio data as array buffer
        const audioBuffer = await openaiResponse.arrayBuffer()
  
        // Convert to base64 for data URL
        const audioBase64 = Buffer.from(audioBuffer).toString("base64")
        const audioUrl = `data:audio/mpeg;base64,${audioBase64}`
  
        return res.status(200).json({ audioUrl })
      }
    } catch (error) {
      console.error("Error generating speech:", error)
      res.status(500).json({ error: "Failed to generate speech" })
    }
  }
  