// pages/api/ask-audio.js
import { personas } from "../../lib/personas";
export const config = { runtime: "edge" };

export default async function handler(req) {
  // 1) Get question and character from GET or POST
  let question = "";
  let character = "daVinci";
  if (req.method === "GET") {
    const url = new URL(req.url);
    question = url.searchParams.get("question") || "";
    character = url.searchParams.get("character") || character;
  } else if (req.method === "POST") {
    try {
      const body = await req.json();
      question = body.question || "";
      character = body.character || character;
    } catch {
      // ignore parse errors
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

  // 2) Determine system prompt based on character
  const persona = personas[character] || personas.daVinci;
  const systemPrompt = persona.systemPrompt;

  // 3) Fetch answer from OpenAI
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
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

  // 4) Stream audio from ElevenLabs (supporting multiple voices)
   // 4) Stream audio from ElevenLabs using the selected persona’s voice
   const elevenApiKey = process.env.ELEVENLABS_API_KEY;
   const voiceId      = persona.voiceId || process.env.ELEVENLABS_VOICE_ID;
   console.log(`ElevenLabs voice for ${character}: ${voiceId}`);
   const ttsRes = await fetch(
     `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
     {
       method: "POST",
       headers: {
         "Content-Type":  "application/json",
         "xi-api-key":     elevenApiKey,
       },
       body: JSON.stringify({
         text: answer,
         voice_settings: { stability: 0.75, similarity_boost: 0.75 },
       }),
     }
   );
 

  // 5) Return the audio stream
  return new Response(ttsRes.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

