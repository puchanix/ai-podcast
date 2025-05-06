// pages/api/ask-stream.js

export default async function handler(req, res) {
  const { question } = req.query;

  if (!question) {
    res.status(400).json({ error: "Missing question" });
    return;
  }

  try {
    const elevenApiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // default voice

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": elevenApiKey,
      },
      body: JSON.stringify({
        text: question,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.3,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok || !response.body) {
      console.error("❌ ElevenLabs stream failed", await response.text());
      res.status(500).json({ error: "Failed to stream from ElevenLabs" });
      return;
    }

    // ✅ Explicit headers for mobile browser support
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Access-Control-Allow-Origin", "*");

    response.body.pipe(res);
  } catch (error) {
    console.error("❌ ask-stream error:", error);
    res.status(500).json({ error: "Unexpected error in ask-stream" });
  }
}