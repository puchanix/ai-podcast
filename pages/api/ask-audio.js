// pages/api/ask-audio.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  // 1) Extract question from GET or POST
  let question = "";
  if (req.method === "GET") {
    question = new URL(req.url).searchParams.get("question") || "";
  } else if (req.method === "POST") {
    try {
      const { question: q } = await req.json();
      question = q || "";
    } catch {
      // ignore JSON parse errors
    }
  } else {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!question.trim()) {
    return new Response(
      JSON.stringify({ error: "Missing question" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2) Fetch full answer from OpenAI
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

  // 3) Stream audio from ElevenLabs using the correct env var names
  const elevenApiKey = process.env.ELEVENLABS_API_KEY;
  const elevenVoiceId = process.env.ELEVENLABS_VOICE_ID;
  const ttsRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": elevenApiKey,
      },
      body: JSON.stringify({
        text: answer,
        voice_settings: { stability: 0.75, similarity_boost: 0.75 },
      }),
    }
  );
  if (!ttsRes.ok) {
    const err = await ttsRes.text();
    console.error("ElevenLabs TTS error:", err);
    return new Response(err, { status: ttsRes.status });
  }

  // 4) Return the audio stream
  return new Response(ttsRes.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}