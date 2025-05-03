export default async function handler(req, res) {
  const { text } = req.body;

  const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/YOUR_VOICE_ID/stream", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    return res.status(500).json({ error: "Failed to generate speech" });
  }

  const audioBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString("base64");

  res.status(200).json({
    audioUrl: `data:audio/mpeg;base64,${base64Audio}`
  });
}
