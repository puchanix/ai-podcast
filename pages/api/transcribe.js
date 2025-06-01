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

  let fileBuffer = null
  let safeFilename = ""

  try {
    // Check if we have the OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" })
    }

    // Parse the form data
    const { buffer, filename } = await parseFormData(req)
    fileBuffer = buffer
    safeFilename = filename

    if (!fileBuffer || fileBuffer.length < 1000) {
      return res.status(400).json({ error: "Audio file too small or missing" })
    }

    // Determine the correct content type and filename for Whisper API
    const apiFilename = safeFilename
    let contentType = "audio/webm"

    if (apiFilename.endsWith(".mp3")) {
      contentType = "audio/mpeg"
    } else if (apiFilename.endsWith(".m4a")) {
      contentType = "audio/mp4"
    } else if (apiFilename.endsWith(".wav")) {
      contentType = "audio/wav"
    }

    const form = new FormData()
    form.append("file", fileBuffer, {
      filename: apiFilename,
      contentType: contentType,
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

    const fullTranscript = response.data.text.trim()

    res.status(200).json({ text: fullTranscript })
  } catch (err) {
    console.error("Transcription error:", err.response?.data || err.message)

    const errorDetails = err.response?.data || {}
    const errorMessage = errorDetails.error?.message || err.message || "Unknown error"

    res.status(500).json({
      error: "Failed to transcribe audio",
      message: errorMessage,
    })
  }
}

// Helper function to parse form data
async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let filename = "recording.webm"

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max file size
      },
    })

    busboy.on("file", (fieldname, file, info) => {
      const { filename: originalFilename } = info
      filename = originalFilename || "recording.webm"

      file.on("data", (chunk) => {
        chunks.push(chunk)
      })
    })

    busboy.on("finish", () => {
      const buffer = Buffer.concat(chunks)
      resolve({ buffer, filename })
    })

    busboy.on("error", (err) => {
      reject(err)
    })

    req.pipe(busboy)
  })
}
