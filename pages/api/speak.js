export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });
  
    try {
      const elevenRes = await fetch(
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
  
      if (!elevenRes.ok) {
        const msg = await elevenRes.text();
        console.error('ElevenLabs error:', msg);
        return res.status(500).json({ error: 'TTS failed' });
      }
  
      const buffer = await elevenRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return res.status(200).json({ audioUrl: `data:audio/mpeg;base64,${base64}` });
    } catch (err) {
      console.error('Speak error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
  
  
  
