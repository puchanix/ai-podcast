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

  try {
    const form = formidable({})
    const [fields, files] = await form.parse(req)

    const audioFile = files.audio?.[0]
    if (!audioFile) {
      return res.status(400).json({ error: "No audio file provided" })
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.filepath),
      model: "whisper-1",
    })

    res.status(200).json({ text: transcription.text })
  } catch (error) {
    console.error("Transcribe API error:", error)
    res.status(500).json({ error: "Failed to transcribe audio" })
  }
}
