import fs from "fs"
import path from "path"

export default function handler(req, res) {
  const { filename } = req.query

  // For security, validate the filename
  if (!filename.match(/^[a-zA-Z0-9_-]+\.mp3$/)) {
    return res.status(400).send("Invalid filename")
  }

  try {
    // In a real implementation, you would retrieve the file from your storage solution
    // For now, we'll return a silent MP3 as a placeholder
    const silentMp3Path = path.join(process.cwd(), "public", "silent.mp3")

    if (fs.existsSync(silentMp3Path)) {
      const fileBuffer = fs.readFileSync(silentMp3Path)

      res.setHeader("Content-Type", "audio/mpeg")
      res.setHeader("Content-Length", fileBuffer.length)
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
      return res.send(fileBuffer)
    } else {
      // If the silent MP3 doesn't exist, return a 404
      return res.status(404).send("Audio file not found")
    }
  } catch (error) {
    console.error("Error serving audio file:", error)
    return res.status(500).send("Internal Server Error")
  }
}