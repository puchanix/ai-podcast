// ask-stream.js
export const config = { runtime: 'edge' };


import { Readable } from 'stream';

export default async function handler(req, res) {
  const { question } = req.query;

  if (!question) {
    res.status(400).json({ error: "Missing question" });
    return;
  }

  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const elevenApiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // default voice

    // 🔍 Step 1: Ask GPT-4
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are Leonardo da Vinci. Answer as he would, thoughtfully and clearly." },
          { role: "user", content: question },
        ],
        temperature: 0.7,
      }),
    });

    const gptData = await gptResponse.json();
    const answer = gptData.choices?.[0]?.message?.content;

    if (!answer) {
      console.error("❌ GPT failed:", gptData);
      res.status(500).json({ error: "GPT response invalid" });
      return;
    }

    // 🎙️ Step 2: Send GPT answer to ElevenLabs
    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": elevenApiKey,
      },
      body: JSON.stringify({
        text: answer,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.3,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!ttsResponse.ok || !ttsResponse.body) {
      console.error("❌ ElevenLabs stream failed", await ttsResponse.text());
      res.status(500).json({ error: "Failed to stream from ElevenLabs" });
      return;
    }

    // ✅ Set headers and stream audio
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const nodeStream = Readable.fromWeb(ttsResponse.body);
    nodeStream.pipe(res);
  } catch (error) {
    console.error("❌ ask-stream error:", error);
    res.status(500).json({ error: "Unexpected error in ask-stream" });
  }
}