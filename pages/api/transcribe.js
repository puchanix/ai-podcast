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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" })
    }

    const { buffer, filename } = await parseFormData(req)

    if (!buffer || buffer.length < 1000) {
      return res.status(400).json({ error: "Audio file too small or missing" })
    }

    const form = new FormData()
    form.append("file", buffer, {
      filename: filename || "recording.webm",
      contentType: "audio/webm",
    })
    form.append("model", "whisper-1")
    form.append("response_format", "json")
    form.append("language", "en")
    form.append("temperature", "0.0")

    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      timeout: 60000,
    })

    if (!response.data || !response.data.text) {
      return res.status(500).json({ error: "No transcript in response" })
    }

    res.status(200).json({ text: response.data.text.trim() })
  } catch (err) {
    console.error("Transcription error:", err.response?.data || err.message)
    res.status(500).json({
      error: "Failed to transcribe audio",
      message: err.message || "Unknown error",
    })
  }
}

async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let filename = "recording.webm"

    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: 25 * 1024 * 1024 },
    })

    busboy.on("file", (fieldname, file, info) => {
      filename = info.filename || "recording.webm"
      file.on("data", (chunk) => chunks.push(chunk))
    })

    busboy.on("finish", () => {
      resolve({ buffer: Buffer.concat(chunks), filename })
    })

    busboy.on("error", reject)
    req.pipe(busboy)
  })
}
