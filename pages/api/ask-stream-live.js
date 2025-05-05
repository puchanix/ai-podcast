
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
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: question }],
        stream: true,
      }),
    });

    if (!gptRes.ok || !gptRes.body) {
      throw new Error("GPT streaming failed");
    }

    res.setHeader("Content-Type", "text/plain");

    const reader = gptRes.body.getReader();
    const decoder = new TextDecoder("utf-8");

    // Just stream tokens as-is for now (text), later to be sent to ElevenLabs
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      res.write(chunk); // debugging test only
    }

    res.end();
  } catch (err) {
    console.error("ask-stream-live error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
