export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { text } = req.body;
  
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + process.env.ELEVENLABS_VOICE_ID, {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8
          }
        })
      });
  
      const buffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(buffer).toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
  
      res.status(200).json({ audioUrl });
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  }