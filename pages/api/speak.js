export default async function handler(req, res) {
  const { text } = req.body;

  const ttsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.7
        }
      })
    }
  );

  const buffer = await ttsResponse.arrayBuffer();
  const base64Audio = Buffer.from(buffer).toString("base64");
  const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
  res.status(200).json({ audioUrl });
}
