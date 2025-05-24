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
  console.log("🔍 [TRANSCRIBE API DEBUG] Headers:", JSON.stringify(req.headers, null, 2))

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  let fileBuffer = null
  let safeFilename = ""
  let isIOS = false
  let originalMimeType = ""

  try {
    // Check if we have the OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("🔍 [TRANSCRIBE API DEBUG] Missing OPENAI_API_KEY")
      return res.status(500).json({ error: "OpenAI API key not configured" })
    }

    // Parse the form data
    const { buffer, filename, ios, mimeType } = await parseFormData(req)
    fileBuffer = buffer
    safeFilename = filename
    isIOS = ios
    originalMimeType = mimeType

    console.log("🔍 [TRANSCRIBE API DEBUG] Parsed form data:")
    console.log("🔍 [TRANSCRIBE API DEBUG] - Buffer size:", fileBuffer?.length, "bytes")
    console.log("🔍 [TRANSCRIBE API DEBUG] - Filename:", safeFilename)
    console.log("🔍 [TRANSCRIBE API DEBUG] - Original MIME type:", originalMimeType)
    console.log("🔍 [TRANSCRIBE API DEBUG] - iOS:", isIOS)

    if (!fileBuffer || fileBuffer.length < 1000) {
      console.error("❌ Audio file too small or missing")
      return res.status(400).json({ error: "Audio file too small or missing" })
    }

    // Log first few bytes to check file format
    const firstBytes = fileBuffer.slice(0, 16)
    console.log(
      "🔍 [TRANSCRIBE API DEBUG] First 16 bytes:",
      Array.from(firstBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" "),
    )

    console.log(`📦 Processing audio file: ${safeFilename}, size: ${fileBuffer.length} bytes, iOS: ${isIOS}`)

    // Determine the correct content type and filename for Whisper API
    let apiFilename = safeFilename
    let contentType = originalMimeType

    // Better content type detection
    if (apiFilename.endsWith(".mp3") || originalMimeType.includes("mpeg")) {
      contentType = "audio/mpeg"
      apiFilename = "recording.mp3"
    } else if (apiFilename.endsWith(".m4a") || originalMimeType.includes("mp4")) {
      contentType = "audio/mp4"
      apiFilename = "recording.m4a"
    } else if (apiFilename.endsWith(".webm") || originalMimeType.includes("webm")) {
      contentType = "audio/webm"
      apiFilename = "recording.webm"
    } else if (apiFilename.endsWith(".wav") || originalMimeType.includes("wav")) {
      contentType = "audio/wav"
      apiFilename = "recording.wav"
    } else {
      // Check file signature to determine format
      const signature = firstBytes.slice(0, 4)
      if (signature[0] === 0x52 && signature[1] === 0x49 && signature[2] === 0x46 && signature[3] === 0x46) {
        // RIFF header (WAV or WEBM)
        contentType = "audio/wav"
        apiFilename = "recording.wav"
      } else if (signature[0] === 0xff && (signature[1] & 0xe0) === 0xe0) {
        // MP3 header
        contentType = "audio/mpeg"
        apiFilename = "recording.mp3"
      } else {
        // Default fallback
        contentType = "audio/webm"
        apiFilename = "recording.webm"
      }
    }

    console.log(`🔊 Using content type: ${contentType} for file: ${apiFilename}`)

    const form = new FormData()
    form.append("file", fileBuffer, {
      filename: apiFilename,
      contentType: contentType,
    })

    form.append("model", "whisper-1")
    form.append("response_format", "verbose_json") // Use verbose to get more info
    form.append("language", "en")
    form.append("temperature", "0.0") // Lower temperature for more accurate transcription

    console.log(`🔊 Sending audio to Whisper API with filename: ${apiFilename}`)
    console.log(`🔊 Request details:`)
    console.log(`🔊 - Model: whisper-1`)
    console.log(`🔊 - Response format: verbose_json`)
    console.log(`🔊 - Language: en`)
    console.log(`🔊 - Temperature: 0.0`)

    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      timeout: 60000,
    })

    console.log("🔍 [TRANSCRIBE API DEBUG] OpenAI response status:", response.status)
    console.log("🔍 [TRANSCRIBE API DEBUG] OpenAI response data:", JSON.stringify(response.data, null, 2))

    // Check if we got a valid response
    if (!response.data) {
      console.error("❌ Invalid response from Whisper API:", response.data)
      return res.status(500).json({ error: "Invalid response from transcription service" })
    }

    let fullTranscript = ""

    // Handle verbose_json response
    if (response.data.text) {
      fullTranscript = response.data.text.trim()
      console.log("📜 Full Whisper transcript:", fullTranscript)
      console.log("🔍 [TRANSCRIBE API DEBUG] Transcribed text:", fullTranscript)

      // Log additional verbose info if available
      if (response.data.segments) {
        console.log("🔍 [TRANSCRIBE API DEBUG] Segments:", response.data.segments.length)
        response.data.segments.forEach((segment, i) => {
          console.log(`🔍 [TRANSCRIBE API DEBUG] Segment ${i}:`, segment.text, `(${segment.start}s - ${segment.end}s)`)
        })
      }
      if (response.data.language) {
        console.log("🔍 [TRANSCRIBE API DEBUG] Detected language:", response.data.language)
      }
    } else {
      console.error("❌ No transcript in response:", response.data)
      return res.status(500).json({ error: "No transcript in response" })
    }

    res.status(200).json({
      text: fullTranscript,
      debug: {
        originalMimeType,
        detectedContentType: contentType,
        filename: apiFilename,
        bufferSize: fileBuffer.length,
        language: response.data.language,
        segments: response.data.segments?.length || 0,
      },
    })
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
    let filename = "recording.webm" // Default filename
    let isIOS = false
    let mimeType = ""

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max file size
      },
    })

    busboy.on("file", (fieldname, file, info) => {
      const { filename: originalFilename, mimeType: originalMimeType } = info

      console.log("🔍 [BUSBOY DEBUG] File received:")
      console.log("🔍 [BUSBOY DEBUG] - Fieldname:", fieldname)
      console.log("🔍 [BUSBOY DEBUG] - Original filename:", originalFilename)
      console.log("🔍 [BUSBOY DEBUG] - MIME type:", originalMimeType)

      mimeType = originalMimeType
      filename = originalFilename || "recording.webm"

      console.log(`📥 Processing uploaded file: ${originalFilename}, MIME type: ${originalMimeType}`)

      file.on("data", (chunk) => {
        chunks.push(chunk)
        console.log("🔍 [BUSBOY DEBUG] Received chunk of size:", chunk.length)
      })

      file.on("end", () => {
        console.log("🔍 [BUSBOY DEBUG] File stream ended")
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
      resolve({ buffer, filename, ios: isIOS, mimeType })
    })

    busboy.on("error", (err) => {
      console.error("❌ Busboy error:", err)
      reject(err)
    })

    req.pipe(busboy)
  })
}
