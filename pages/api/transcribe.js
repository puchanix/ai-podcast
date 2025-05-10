import Busboy from "busboy"
import fs from "fs"
import os from "os"
import path from "path"
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

  const tmpdir = os.tmpdir()
  let safeFilename = ""
  let isIOS = false
  let mimeType = ""

  const fileWritePromise = new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max file size
      },
    })
    let filepath = ""

    busboy.on("file", (fieldname, file, info) => {
      const { filename, mimeType: fileMimeType } = info

      safeFilename = typeof filename === "string" ? filename : "input.webm"
      mimeType = fileMimeType || "audio/webm"

      filepath = path.join(tmpdir, safeFilename)

      console.log(`📥 Writing uploaded file to: ${filepath}`)
      console.log(`📊 File mimetype: ${mimeType}`)

      const writeStream = fs.createWriteStream(filepath)
      file.pipe(writeStream)
      writeStream.on("close", () => resolve(filepath))
      writeStream.on("error", reject)
    })

    busboy.on("field", (fieldname, val) => {
      if (fieldname === "isIOS" && val === "true") {
        isIOS = true
        console.log("📱 iOS device detected")
      }
    })

    busboy.on("error", (err) => {
      console.error("❌ Busboy error:", err)
      reject(err)
    })

    req.pipe(busboy)
  })

  try {
    const localPath = await fileWritePromise
    const fileBuffer = fs.readFileSync(localPath)
    const fileSize = fileBuffer.length

    console.log(`📦 Processing audio file: ${safeFilename}, size: ${fileSize} bytes, iOS: ${isIOS}`)

    // If file is too small, it might be corrupted
    if (fileSize < 1000) {
      console.error("❌ Audio file too small, likely corrupted")
      return res.status(400).json({ error: "Audio file too small or corrupted" })
    }

    // Determine the correct content type based on file extension
    let contentType = mimeType
    if (safeFilename.endsWith(".m4a")) {
      contentType = "audio/mp4"
    } else if (safeFilename.endsWith(".mp3")) {
      contentType = "audio/mpeg"
    } else if (safeFilename.endsWith(".wav")) {
      contentType = "audio/wav"
    } else if (safeFilename.endsWith(".webm")) {
      contentType = "audio/webm"
    }

    // For iOS, always use mp4 content type
    if (isIOS) {
      contentType = "audio/mp4"
    }

    console.log(`🔊 Using content type: ${contentType} for file: ${safeFilename}`)

    // Create a new filename with the correct extension for Whisper API
    let apiFilename = safeFilename
    if (isIOS && !safeFilename.endsWith(".m4a")) {
      apiFilename = "recording.m4a"
    }

    const form = new FormData()
    form.append("file", fileBuffer, {
      filename: apiFilename,
      contentType: contentType,
    })

    form.append("model", "whisper-1")
    // Use simple response format instead of verbose_json
    form.append("response_format", "json")
    form.append("language", "en")
    form.append("temperature", "0.2")

    console.log(`🔊 Sending audio to Whisper API with filename: ${apiFilename}`)

    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      timeout: 60000,
    })

    // Check if we got a valid response
    if (!response.data) {
      console.error("❌ Invalid response from Whisper API:", response.data)
      return res.status(500).json({ error: "Invalid response from transcription service" })
    }

    let fullTranscript = ""

    // Handle both verbose_json and simple text responses
    if (response.data.text) {
      fullTranscript = response.data.text.trim()
      console.log("📜 Full Whisper transcript:", fullTranscript)
    } else {
      console.error("❌ No transcript in response:", response.data)
      return res.status(500).json({ error: "No transcript in response" })
    }

    // Clean up the temporary files
    try {
      fs.unlinkSync(localPath)
    } catch (err) {
      console.error("⚠️ Failed to clean up temp files:", err)
    }

    res.status(200).json({ text: fullTranscript })
  } catch (err) {
    console.error("❌ Final transcription error:", err.response?.data || err.message)

    // More detailed error response
    const errorDetails = err.response?.data || {}
    const errorMessage = errorDetails.error?.message || err.message || "Unknown error"

    res.status(500).json({
      error: "Failed to transcribe audio",
      message: errorMessage,
      details: errorDetails,
    })
  }
}
