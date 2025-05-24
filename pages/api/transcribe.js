export default async function handler(req, res) {
    console.log("🔍 [TRANSCRIBE API DEBUG] Request received")
    console.log("🔍 [TRANSCRIBE API DEBUG] Method:", req.method)
    console.log("🔍 [TRANSCRIBE API DEBUG] Content-Type:", req.headers["content-type"])
  
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
  
      // Parse multipart form data manually to extract the audio file
      const boundary = req.headers["content-type"]?.split("boundary=")[1]
      if (!boundary) {
        throw new Error("No boundary found in content-type")
      }
  
      console.log("🔍 [TRANSCRIBE API DEBUG] Boundary:", boundary)
  
      // Find the audio file in the multipart data
      const boundaryBuffer = Buffer.from(`--${boundary}`)
      const parts = []
      let start = 0
  
      while (true) {
        const boundaryIndex = buffer.indexOf(boundaryBuffer, start)
        if (boundaryIndex === -1) break
  
        if (start > 0) {
          parts.push(buffer.slice(start, boundaryIndex))
        }
        start = boundaryIndex + boundaryBuffer.length
      }
  
      console.log("🔍 [TRANSCRIBE API DEBUG] Found", parts.length, "parts")
  
      // Find the part that contains the audio file
      let audioBuffer = null
      for (const part of parts) {
        const partStr = part.toString("utf8", 0, Math.min(500, part.length))
        if (partStr.includes("filename=") && partStr.includes("audio")) {
          // Find where the headers end (double CRLF)
          const headerEnd = part.indexOf("\r\n\r\n")
          if (headerEnd !== -1) {
            audioBuffer = part.slice(headerEnd + 4)
            // Remove trailing CRLF if present
            if (audioBuffer.length > 2 && audioBuffer.slice(-2).toString() === "\r\n") {
              audioBuffer = audioBuffer.slice(0, -2)
            }
            break
          }
        }
      }
  
      if (!audioBuffer) {
        throw new Error("No audio file found in request")
      }
  
      console.log("🔍 [TRANSCRIBE API DEBUG] Extracted audio buffer size:", audioBuffer.length, "bytes")
  
      // Create form data for OpenAI without using files
      const formData = new FormData()
      const audioBlob = new Blob([audioBuffer], { type: "audio/webm" })
      formData.append("file", audioBlob, "audio.webm")
      formData.append("model", "whisper-1")
      formData.append("language", "en") // Force English
      formData.append("response_format", "json")
  
      console.log("🔍 [TRANSCRIBE API DEBUG] Sending to OpenAI Whisper...")
  
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
      bodyParser: false, // Disable body parsing to handle raw audio data
    },
  }
  