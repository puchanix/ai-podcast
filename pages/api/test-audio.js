// pages/api/test-audio.js
import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  try {
    // Path to a test MP3 file in the public directory
    const audioPath = path.join(process.cwd(), 'public', 'silent.mp3')
    
    // Read the file
    const audioData = fs.readFileSync(audioPath)
    
    // Set headers
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audioData.length)
    
    // Send the file
    res.send(audioData)
  } catch (error) {
    console.error('Error serving test audio:', error)
    res.status(500).json({ error: 'Failed to serve test audio' })
  }
}