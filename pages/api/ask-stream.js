// pages/api/ask‑stream.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  // 1) Extract the question from POST body or GET query
  let question = null;

  if (req.method === "POST") {
    try {
      const { question: q } = await req.json();
      question = q;
    } catch (e) {
      // invalid JSON
    }
  } else if (req.method === "GET") {
    const url = new URL(req.url);
    question = url.searchParams.get("question");
  } else {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!question || !question.trim()) {
    return new Response(
      JSON.stringify({ error: "Missing or empty question" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2) Your system prompt (you can override via env)
  const systemPrompt =
    process.env.SYSTEM_PROMPT ||
    "You are Leonardo da Vinci, the great Renaissance polymath. Answer concisely but thoughtfully.";

  // 3) Call OpenAI with streaming
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const err = await openaiRes.text();
    console.error("OpenAI error:", err);
    return new Response(err, { status: openaiRes.status });
  }

  // 4) Stream the text/event‑stream directly back
  return new Response(openaiRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

