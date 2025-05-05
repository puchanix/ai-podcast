
export const config = {
  runtime: 'nodejs',
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_API_KEY = "sk_800f5bb72970df24eaf8b2d3c8c125ba4e5b3980078bc7c0";
const VOICE_ID = "AZnmrjjEOG9CofMyOxaA";

export default async function handler(req, res) {
  const { question } = req.method === 'POST'
    ? await new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(JSON.parse(body)));
        req.on('error', reject);
      })
    : req.query;

  if (!question) {
    return res.status(400).json({ error: 'Missing question' });
  }

  try {
    // Step 1: Call GPT-4 without streaming
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: question }],
        temperature: 0.7
      }),
    });

    const gptData = await gptRes.json();
    const answer = gptData.choices?.[0]?.message?.content;

    if (!answer) throw new Error("GPT-4 response missing");

    // Step 2: Call ElevenLabs stream endpoint
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: answer,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8
        }
      })
    });

    if (!ttsRes.ok || !ttsRes.body) throw new Error("ElevenLabs streaming failed");

    res.setHeader("Content-Type", "audio/mpeg");
    ttsRes.body.pipe(res);
  } catch (err) {
    console.error("fast-stream error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
