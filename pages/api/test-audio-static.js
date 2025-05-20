import fs from "fs"
import path from "path"

export default function handler(req, res) {
  // Path to a static audio file in the public directory
  const audioPath = path.join(process.cwd(), "public", "test-audio.mp3")

  try {
    // Check if the file exists
    if (!fs.existsSync(audioPath)) {
      console.error("Test audio file not found at:", audioPath)
      return res.status(404).json({ error: "Test audio file not found" })
    }

    // Get file stats
    const stat = fs.statSync(audioPath)
    const fileSize = stat.size

    // Set headers
    res.setHeader("Content-Type", "audio/mpeg")
    res.setHeader("Content-Length", fileSize)
    res.setHeader("Accept-Ranges", "bytes")

    // Handle range requests
    const range = req.headers.range
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = Number.parseInt(parts[0], 10)
      const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1

      if (start >= fileSize) {
        res.status(416).end() // Range Not Satisfiable
        return
      }

      const chunkSize = end - start + 1
      const file = fs.createReadStream(audioPath, { start, end })

      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`)
      res.setHeader("Content-Length", chunkSize)
      res.status(206) // Partial Content

      file.pipe(res)
    } else {
      // Send the entire file
      const file = fs.createReadStream(audioPath)
      res.status(200)
      file.pipe(res)
    }
  } catch (err) {
    console.error("Error serving test audio:", err)
    res.status(500).json({ error: "Error serving test audio file" })
  }
}
