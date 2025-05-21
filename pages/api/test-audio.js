// pages/api/test-audio.js
export default function handler(req, res) {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  
    // Set content type for audio
    res.setHeader("Content-Type", "audio/mpeg")
  
    try {
      // Generate a simple tone as a test
      const sampleRate = 44100
      const duration = 2 // 2 seconds
      const frequency = 440 // A4 note
  
      // Create a buffer for a simple sine wave
      const audioBuffer = Buffer.alloc(sampleRate * duration * 2)
  
      for (let i = 0; i < sampleRate * duration; i++) {
        const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 32767
        audioBuffer.writeInt16LE(Math.floor(sample), i * 2)
      }
  
      res.setHeader("Content-Length", audioBuffer.length)
      return res.send(audioBuffer)
    } catch (error) {
      console.error("Error generating test audio:", error)
      res.status(500).json({ error: "Failed to generate test audio" })
    }
  }
  