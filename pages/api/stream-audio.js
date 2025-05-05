
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = await new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(JSON.parse(body)));
      req.on('error', reject);
    });

    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/AZnmrjjEOG9CofMyOxaA/stream", {
      method: "POST",
      headers: {
        "xi-api-key": "sk_800f5bb72970df24eaf8b2d3c8c125ba4e5b3980078bc7c0",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8
        }
      })
    });

    if (!response.ok || !response.body) {
      return res.status(500).json({ error: 'Failed to stream audio' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    response.body.pipe(res);
  } catch (err) {
    console.error('Streaming error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
