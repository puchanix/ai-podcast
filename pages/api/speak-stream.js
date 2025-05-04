
// pages/api/speak-stream.js

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { text, voice = 'Rachel' } = req.body;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing ElevenLabs API key' });

  try {
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!elevenRes.ok) {
      const errorText = await elevenRes.text();
      console.error("Streaming failed:", errorText);
      return res.status(500).json({ error: 'Streaming failed', detail: errorText });
    }

    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
    });

    elevenRes.body.pipeTo(new WritableStream({
      write(chunk) {
        res.write(Buffer.from(chunk));
      },
      close() {
        res.end();
      },
      abort(err) {
        console.error('Streaming aborted:', err);
        res.end();
      }
    }));
  } catch (err) {
    console.error('Error in stream:', err);
    res.status(500).json({ error: 'Error streaming ElevenLabs audio' });
  }
}
