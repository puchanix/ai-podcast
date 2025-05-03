export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Only POST requests allowed' });
    }
  
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text in request' });
    }
  
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );
  
      if (!response.ok) {
        const errText = await response.text();
        console.error('ElevenLabs TTS error:', errText);
        return res.status(500).json({ error: 'TTS generation failed' });
      }
  
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${base64}`;
  
      res.status(200).json({ audioUrl });
    } catch (err) {
      console.error('Speak API error:', err);
      res.status(500).json({ error: err.message });
    }
  }
  
  
