// pages/api/simple-tone.js
export default function handler(req, res) {
    // Set appropriate headers
    res.setHeader("Content-Type", "audio/mpeg")
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  
    try {
      // Create a simple audio buffer with a sine wave tone
      const sampleRate = 44100 // standard sample rate
      const duration = 2 // 2 seconds
      const frequency = 440 // A4 note
  
      // Create a buffer for the audio data
      const audioBuffer = Buffer.alloc(sampleRate * duration)
  
      // Generate a simple sine wave
      for (let i = 0; i < sampleRate * duration; i++) {
        audioBuffer[i] = Math.floor(Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 127 + 128)
      }
  
      // Set the content length
      res.setHeader("Content-Length", audioBuffer.length)
  
      // Send the audio data
      res.status(200).send(audioBuffer)
    } catch (error) {
      console.error("Error generating test audio:", error)
      res.status(500).json({ error: "Failed to generate test audio" })
    }
  }
  