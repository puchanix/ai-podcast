// pages/api/stream-audio.js
import { NextResponse } from 'next/server'

export default async function handler(req, res) {
  const { id, text, voice } = req.query
  
  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required' })
  }
  
  try {
    // Log the request for debugging
    console.log(`Stream audio request: id=${id}, voice=${voice}, text=${text.substring(0, 50)}...`)
    
    // Create a simple audio response using the Web Speech API on the server
    // This is just for testing - in production you'd use a proper TTS service
    
    // For testing purposes, we'll return a static MP3 file
    // In production, you would generate this dynamically
    
    // Set proper headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    
    // Instead of redirecting, we'll serve the audio directly
    // This is the key fix - we're avoiding the 307 redirect
    
    // For testing, we'll use a static audio file
    // In production, you would generate this dynamically
    const fs = require('fs')
    const path = require('path')
    
    // Path to a test MP3 file in the public directory
    const audioPath = path.join(process.cwd(), 'public', 'silent.mp3')
    
    // Read the file and send it as the response
    const audioData = fs.readFileSync(audioPath)
    res.send(audioData)
    
  } catch (error) {
    console.error('Error streaming audio:', error)
    res.status(500).json({ error: 'Failed to stream audio' })
  }
}