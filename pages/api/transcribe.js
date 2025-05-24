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
  console.log("🔍 [TRANSCRIBE API DEBUG] Request received")
  console.log("🔍 [TRANSCRIBE API DEBUG] Method:", req.method)

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  let fileBuffer = null
  let safeFilename = ""
  let isIOS = false

  try {
    // Check if we have the OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("🔍 [TRANSCRIBE API DEBUG] Missing OPENAI_API_KEY")
      return res.status(500).json({ error: "OpenAI API key not configured" })
    }

    // Parse the form data
    const { buffer, filename, ios } = await parseFormData(req)
    fileBuffer = buffer
    safeFilename = filename
    isIOS = ios

    console.log("🔍 [TRANSCRIBE API DEBUG] Parsed form data:")
    console.log("🔍 [TRANSCRIBE API DEBUG] - Buffer size:", fileBuffer?.length, "bytes")
    console.log("🔍 [TRANSCRIBE API DEBUG] - Filename:", safeFilename)
    console.log("🔍 [TRANSCRIBE API DEBUG] - iOS:", isIOS)

    if (!fileBuffer || fileBuffer.length < 1000) {
      console.error("❌ Audio file too small or missing")
      return res.status(400).json({ error: "Audio file too small or missing" })
    }

    console.log(`📦 Processing audio file: ${safeFilename}, size: ${fileBuffer.length} bytes, iOS: ${isIOS}`)

    // Determine the correct content type and filename for Whisper API
    let apiFilename = safeFilename
    let contentType

    if (apiFilename.endsWith(".mp3")) {
      contentType = "audio/mpeg"
    } else if (apiFilename.endsWith(".m4a")) {
      contentType = "audio/mp4"
    } else if (apiFilename.endsWith(".webm")) {
      contentType = "audio/webm"
    } else if (apiFilename.endsWith(".wav")) {
      contentType = "audio/wav"
    } else {
      // Default fallback
      apiFilename = "recording.mp3"
      contentType = "audio/mpeg"
    }

    console.log(`🔊 Using content type: ${contentType} for file: ${apiFilename}`)

    const form = new FormData()
    form.append("file", fileBuffer, {
      filename: apiFilename,
      contentType: contentType,
    })

    form.append("model", "whisper-1")
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

    console.log("🔍 [TRANSCRIBE API DEBUG] OpenAI response status:", response.status)

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
      console.log("🔍 [TRANSCRIBE API DEBUG] Transcribed text:", fullTranscript)
    } else {
      console.error("❌ No transcript in response:", response.data)
      return res.status(500).json({ error: "No transcript in response" })
    }

    res.status(200).json({ text: fullTranscript })
  } catch (err) {
    console.error("❌ Final transcription error:", err.response?.data || err.message)
    console.error("🔍 [TRANSCRIBE API DEBUG] Full error:", err)

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

// Helper function to parse form data
async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let filename = "recording.mp3" // Default filename
    let isIOS = false

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max file size
      },
    })

    busboy.on("file", (fieldname, file, info) => {
      const { filename: originalFilename, mimeType } = info

      console.log("🔍 [BUSBOY DEBUG] File received:")
      console.log("🔍 [BUSBOY DEBUG] - Fieldname:", fieldname)
      console.log("🔍 [BUSBOY DEBUG] - Original filename:", originalFilename)
      console.log("🔍 [BUSBOY DEBUG] - MIME type:", mimeType)

      // Determine the appropriate filename based on the MIME type
      if (originalFilename) {
        if (originalFilename.endsWith(".mp3") || mimeType.includes("mpeg")) {
          filename = "recording.mp3"
        } else if (originalFilename.endsWith(".m4a") || mimeType.includes("mp4")) {
          filename = "recording.mp3" // Convert to mp3 for better compatibility
        } else if (originalFilename.endsWith(".webm") || mimeType.includes("webm")) {
          filename = "recording.webm"
        } else if (originalFilename.endsWith(".wav") || mimeType.includes("wav")) {
          filename = "recording.wav"
        }
      }

      console.log(`📥 Processing uploaded file: ${originalFilename}, MIME type: ${mimeType}`)
      console.log(`📥 Using filename: ${filename}`)

      file.on("data", (chunk) => {
        chunks.push(chunk)
      })
    })

    busboy.on("field", (fieldname, val) => {
      console.log("🔍 [BUSBOY DEBUG] Field received:", fieldname, "=", val)
      if (fieldname === "isIOS" && val === "true") {
        isIOS = true
        console.log("📱 iOS device detected")
      }
    })

    busboy.on("finish", () => {
      const buffer = Buffer.concat(chunks)
      console.log("🔍 [BUSBOY DEBUG] Parsing complete, buffer size:", buffer.length)
      resolve({ buffer, filename, ios: isIOS })
    })

    busboy.on("error", (err) => {
      console.error("❌ Busboy error:", err)
      reject(err)
    })

    req.pipe(busboy)
  })
}
