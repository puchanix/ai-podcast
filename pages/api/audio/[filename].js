export default function handler(req, res) {
    const { filename } = req.query
  
    // For security, validate the filename
    if (!filename.match(/^[a-zA-Z0-9_-]+\.mp3$/)) {
      return res.status(400).send("Invalid filename")
    }
  
    try {
      // In a real implementation, you would retrieve the file from your storage solution
      // For now, we'll return a silent MP3 as a placeholder
      res.setHeader("Content-Type", "audio/mpeg")
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
  
      // Redirect to the silent.mp3 file in the public directory
      res.redirect(307, "/silent.mp3")
    } catch (error) {
      console.error("Error serving audio file:", error)
      res.status(500).send("Internal Server Error")
    }
  }
  