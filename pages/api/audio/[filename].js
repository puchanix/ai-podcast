import fs from "fs"
import path from "path"
import { promisify } from "util"

const readFileAsync = promisify(fs.readFile)
const existsAsync = promisify(fs.exists)

export default async function handler(req, res) {
  const { filename } = req.query

  try {
    console.log(`Audio API: Requested file: ${filename}`)

    // Validate filename to prevent directory traversal attacks
    if (!filename || filename.includes("..") || filename.includes("/")) {
      console.error(`Audio API: Invalid filename: ${filename}`)
      return res.status(400).json({ error: "Invalid filename" })
    }

    // Check if the file exists in the public/audio directory
    const filePath = path.join(process.cwd(), "public", "audio", filename)
    const exists = await existsAsync(filePath)

    if (!exists) {
      console.error(`Audio API: File not found: ${filePath}`)
      return res.status(404).json({ error: "File not found" })
    }

    // Read the file
    const fileData = await readFileAsync(filePath)
    console.log(`Audio API: File size: ${fileData.length} bytes`)

    if (fileData.length === 0) {
      console.error(`Audio API: Empty file: ${filePath}`)
      return res.status(500).json({ error: "Empty file" })
    }

    // Set the appropriate content type
    res.setHeader("Content-Type", "audio/mpeg")
    res.setHeader("Content-Length", fileData.length)

    // Send the file
    res.send(fileData)
  } catch (error) {
    console.error(`Audio API error:`, error)
    res.status(500).json({ error: error.message })
  }
}
