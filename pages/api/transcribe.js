import Busboy from "busboy"
import fs from "fs"
import os from "os"
import path from "path"
import FormData from "form-data"
import axios from "axios"
import { exec } from "child_process"
import { promisify } from "util"

const execPromise = promisify(exec)

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

  const fileWritePromise = new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max file size
      },
    })
    let filepath = ""

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      safeFilename = typeof filename === "string" ? filename : "input.webm"
      filepath = path.join(tmpdir, safeFilename)

      console.log(`📥 Writing uploaded file to: ${filepath}`)
      console.log(`📊 File mimetype: ${mimetype}`)

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

    // Convert to MP3 format which is universally supported by Whisper API
    const mp3Path = path.join(tmpdir, "converted.mp3")

    try {
      // Check if ffmpeg is available
      await execPromise("ffmpeg -version")

      // Convert to MP3 using ffmpeg
      await execPromise(`ffmpeg -i "${localPath}" -c:a libmp3lame -q:a 2 "${mp3Path}"`)
      console.log("🔄 Converted audio to MP3 format")
    } catch (conversionError) {
      console.error("⚠️ FFmpeg conversion failed:", conversionError)
      console.log("⚠️ Proceeding with original file")
      // If conversion fails, we'll try with the original file
    }

    // Use the MP3 file if it exists and has content, otherwise use the original
    const finalPath = fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 0 ? mp3Path : localPath

    const finalBuffer = fs.readFileSync(finalPath)
    const finalFilename = path.basename(finalPath)

    console.log(`🔊 Using file for transcription: ${finalFilename}, size: ${finalBuffer.length} bytes`)

    const form = new FormData()
    form.append("file", finalBuffer, {
      filename: finalFilename,
      contentType: finalFilename.endsWith(".mp3") ? "audio/mpeg" : "audio/webm",
    })

    form.append("model", "whisper-1")
    form.append("response_format", "verbose_json")
    form.append("language", "en")
    form.append("temperature", "0.2")

    console.log(`🔊 Sending audio to Whisper API...`)

    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      timeout: 60000,
    })

    // Check if we got a valid response
    if (!response.data || !response.data.segments) {
      console.error("❌ Invalid response from Whisper API:", response.data)
      return res.status(500).json({ error: "Invalid response from transcription service" })
    }

    console.log("📑 Segments count:", response.data.segments.length)

    // Extract full transcript from segments
    const segments = response.data.segments || []
    const fullTranscript = segments
      .map((s) => s.text)
      .join(" ")
      .trim()

    console.log("📜 Full Whisper transcript:", fullTranscript)

    // Clean up the temporary files
    try {
      fs.unlinkSync(localPath)
      if (fs.existsSync(mp3Path)) {
        fs.unlinkSync(mp3Path)
      }
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
