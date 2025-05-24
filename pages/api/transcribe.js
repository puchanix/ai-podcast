export default async function handler(req, res) {
    console.log("🔍 [TRANSCRIBE API DEBUG] Request received")
    console.log("🔍 [TRANSCRIBE API DEBUG] Method:", req.method)
  
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }
  
    try {
      // Check if we have the OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.error("🔍 [TRANSCRIBE API DEBUG] Missing OPENAI_API_KEY")
        return res.status(500).json({ error: "OpenAI API key not configured" })
      }
  
      // Get the raw body as buffer
      const chunks = []
      req.on("data", (chunk) => chunks.push(chunk))
  
      await new Promise((resolve) => {
        req.on("end", resolve)
      })
  
      const buffer = Buffer.concat(chunks)
      console.log("🔍 [TRANSCRIBE API DEBUG] Audio buffer size:", buffer.length, "bytes")
  
      // Create FormData for OpenAI Whisper API
      const formData = new FormData()
  
      // Create blob from the audio buffer
      const audioBlob = new Blob([buffer], { type: "audio/webm" })
      formData.append("file", audioBlob, "audio.webm")
      formData.append("model", "whisper-1")
      formData.append("response_format", "json")
  
      console.log("🔍 [TRANSCRIBE API DEBUG] Sending to OpenAI Whisper API...")
  
      // Call OpenAI Whisper API directly
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      })
  
      console.log("🔍 [TRANSCRIBE API DEBUG] OpenAI response status:", response.status)
  
      if (!response.ok) {
        const errorText = await response.text()
        console.error("🔍 [TRANSCRIBE API DEBUG] OpenAI error:", errorText)
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
      }
  
      const result = await response.json()
      console.log("🔍 [TRANSCRIBE API DEBUG] OpenAI result:", result)
      console.log("🔍 [TRANSCRIBE API DEBUG] Transcribed text:", result.text)
  
      return res.status(200).json({ text: result.text })
    } catch (error) {
      console.error("🔍 [TRANSCRIBE API DEBUG] Transcription error:", error)
      return res.status(500).json({ error: "Failed to transcribe audio: " + error.message })
    }
  }
  
  export const config = {
    api: {
      bodyParser: false,
    },
  }
  