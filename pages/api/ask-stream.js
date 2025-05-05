
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
    console.error("Missing question");
    return res.status(400).json({ error: 'Missing question' });
  }

  console.log("Received question:", question);

  try {
    const prompt = [
      {
        role: "system",
        content: "You are Leonardo da Vinci hosting a podcast. Answer briefly, with charm and wit, in 1–2 sentences."
      },
      {
        role: "user",
        content: question
      }
    ];

    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: prompt,
        max_tokens: 100,
        temperature: 0.7
      }),
    });

    const gptData = await gptRes.json();
    console.log("GPT raw response:", JSON.stringify(gptData));

    const answer = gptData.choices?.[0]?.message?.content?.trim();
    console.log("GPT answer:", answer);

    if (!answer) throw new Error("GPT response missing");

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
      }),
    });

    console.log("ElevenLabs status:", ttsRes.status);

    if (!ttsRes.ok || !ttsRes.body) throw new Error("ElevenLabs stream failed");

    const audioBuffer = await ttsRes.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error("ask-stream error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
