import OpenAI from "openai"
import formidable from "formidable"
import fs from "fs"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  console.log("🔍 [TRANSCRIBE API] Request received:", req.method)
  console.log("🔍 [TRANSCRIBE API] Headers:", req.headers)

  try {
    const form = formidable({})
    const [fields, files] = await form.parse(req)
    console.log("🔍 [TRANSCRIBE API] Files received:", Object.keys(files))
    console.log("🔍 [TRANSCRIBE API] Audio file details:", files.audio?.[0])

    const audioFile = files.audio?.[0]
    if (!audioFile) {
      console.error("🔍 [TRANSCRIBE API] No audio file in request")
      return res.status(400).json({ error: "No audio file provided" })
    }

    if (!audioFile.filepath) {
      console.error("🔍 [TRANSCRIBE API] Audio file has no filepath")
      return res.status(400).json({ error: "Invalid audio file" })
    }

    console.log("🔍 [TRANSCRIBE API] Audio file path:", audioFile.filepath)
    console.log("🔍 [TRANSCRIBE API] Audio file size:", audioFile.size)

    try {
      console.log("🔍 [TRANSCRIBE API] Calling OpenAI Whisper API...")
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFile.filepath),
        model: "whisper-1",
      })
      console.log("🔍 [TRANSCRIBE API] Transcription successful:", transcription.text)
      res.status(200).json({ text: transcription.text })
    } catch (openaiError) {
      console.error("🔍 [TRANSCRIBE API] OpenAI error:", openaiError)
      res.status(500).json({ error: "OpenAI transcription failed", details: openaiError.message })
    }
  } catch (error) {
    console.error("Transcribe API error:", error)
    res.status(500).json({ error: "Failed to transcribe audio" })
  }
}
