// pages/api/direct-audio.js
export default async function handler(req, res) {
    const { text, voice = 'en-US-Neural2-D' } = req.query;
    
    console.log('Direct audio request:', { text: text?.substring(0, 50) + '...', voice });
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set content type for audio
    res.setHeader('Content-Type', 'audio/mpeg');
    
    try {
      // Forward the request to the speak endpoint which is working in index.js
      const speakUrl = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''}/api/speak`;
      
      const response = await fetch(speakUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error(`Speak API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // The speak API returns a data URL, extract the base64 part
      const base64Data = data.audioUrl.split(',')[1];
      const audioBuffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Length', audioBuffer.length);
      return res.send(audioBuffer);
    } catch (error) {
      console.error('Error generating audio:', error);
      res.status(500).json({ error: 'Failed to generate audio' });
    }
  }