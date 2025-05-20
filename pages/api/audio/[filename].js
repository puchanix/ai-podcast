// pages/api/audio/[filename].js

export default function handler(req, res) {
    // This is a simple handler that returns a silent MP3
    // In a real implementation, you would retrieve the actual audio file
    
    // Set the content type to audio/mpeg
    res.setHeader('Content-Type', 'audio/mpeg');
    
    // Return a 200 status with an empty response
    // This will effectively create a silent audio response
    res.status(200).end();
  }