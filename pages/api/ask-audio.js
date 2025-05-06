// pages/api/ask-audio.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  // 1) Get question from GET or POST
  let question = "";
  if (req.method === "GET") {
    question = new URL(req.url).searchParams.get("question") || "";
  } else if (req.method === "POST") {
    try {
      const { question: q } = await req.json();
      question = q || "";
    } catch {}
  } else {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!question.trim()) {
    return new Response(
      JSON.stringify({ error: "Missing question" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2) Fetch the full answer from OpenAI
  const systemPrompt =
    process.env.SYSTEM_PROMPT ||
    "You are Leonardo da Vinci, the great Renaissance polymath. Answer concisely but thoughtfully.";
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      max_tokens: 500,
    }),
  });
  if (!openaiRes.ok) {
    const err = await openaiRes.text();
    console.error("OpenAI error:", err);
    return new Response(err, { status: openaiRes.status });
  }
  const { choices } = await openaiRes.json();
  const answer = choices[0].message.content.trim();

  // 3) Send text to ElevenLabs TTS streaming endpoint
  const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}/stream`;
  const ttsRes = await fetch(ttsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVEN_API_KEY,
    },
    body: JSON.stringify({
      text: answer,
      voice_settings: {
        stability: 0.75,
        similarity_boost: 0.75,
      },
    }),
  });
  if (!ttsRes.ok) {
    const err = await ttsRes.text();
    console.error("ElevenLabs TTS error:", err);
    return new Response(err, { status: ttsRes.status });
  }

  // 4) Pipe the audio back
  return new Response(ttsRes.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
