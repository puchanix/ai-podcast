import Busboy from "busboy"
import FormData from "form-data"
import axios from "axios"

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
}

export default async function handler(req, res) {
  console.log("🎤 [TRANSCRIBE] API called")
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("🎤 [TRANSCRIBE] OpenAI API key not configured")
      return res.status(500).json({ error: "OpenAI API key not configured" })
    }

    console.log("🎤 [TRANSCRIBE] Parsing form data...")
    const { buffer, filename } = await parseFormData(req)
    console.log("🎤 [TRANSCRIBE] Buffer size:", buffer?.length, "Filename:", filename)

    if (!buffer || buffer.length < 100) { // Reduced from 1000 to 100
      console.error("🎤 [TRANSCRIBE] Audio file too small:", buffer?.length)
      return res.status(400).json({ error: "Audio file too small or missing" })
    }

    console.log("🎤 [TRANSCRIBE] Creating form data for OpenAI...")
    const form = new FormData()
    form.append("file", buffer, {
      filename: filename || "recording.webm",
      contentType: "audio/webm",
    })
    form.append("model", "whisper-1")
    form.append("response_format", "json")
    form.append("language", "en")
    form.append("temperature", "0.0")

    console.log("🎤 [TRANSCRIBE] Sending to OpenAI...")
    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      timeout: 60000,
    })

    console.log("🎤 [TRANSCRIBE] OpenAI response received")
    
    if (!response.data || !response.data.text) {
      console.error("🎤 [TRANSCRIBE] No transcript in response:", response.data)
      return res.status(500).json({ error: "No transcript in response" })
    }

    console.log("🎤 [TRANSCRIBE] Success:", response.data.text.substring(0, 50) + "...")
    res.status(200).json({ text: response.data.text.trim() })
  } catch (err) {
    console.error("🎤 [TRANSCRIBE] Error:", err.response?.data || err.message)
    console.error("🎤 [TRANSCRIBE] Full error:", err)
    res.status(500).json({
      error: "Failed to transcribe audio",
      message: err.message || "Unknown error",
      details: err.response?.data || null
    })
  }
}

async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let filename = "recording.webm"

    try {
      const busboy = Busboy({
        headers: req.headers,
        limits: { fileSize: 25 * 1024 * 1024 },
      })

      busboy.on("file", (fieldname, file, info) => {
        console.log("🎤 [TRANSCRIBE] File received:", fieldname, info)
        filename = info.filename || "recording.webm"
        
        file.on("data", (chunk) => {
          console.log("🎤 [TRANSCRIBE] Chunk received:", chunk.length)
          chunks.push(chunk)
        })
        
        file.on("end", () => {
          console.log("🎤 [TRANSCRIBE] File stream ended")
        })
      })

      busboy.on("finish", () => {
        console.log("🎤 [TRANSCRIBE] Busboy finished, total chunks:", chunks.length)
        resolve({ buffer: Buffer.concat(chunks), filename })
      })

      busboy.on("error", (error) => {
        console.error("🎤 [TRANSCRIBE] Busboy error:", error)
        reject(error)
      })

      req.pipe(busboy)
    } catch (error) {
      console.error("🎤 [TRANSCRIBE] Parse error:", error)
      reject(error)
    }
  })
}