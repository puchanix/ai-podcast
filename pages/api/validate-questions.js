// pages/api/validate-question.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  let question = "";
  if (req.method === "POST") {
    try {
      const { question: q } = await req.json();
      question = q || "";
    } catch {}
  } else {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!question.trim()) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Call OpenAI to classify
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a classifier. Reply exactly with VALID if the user text is a clear, answerable question, otherwise reply EXACTLY with INVALID.",
        },
        { role: "user", content: question },
      ],
      max_tokens: 1,
    }),
  });
  const { choices } = await openaiRes.json();
  const verdict = (choices[0].message.content || "").trim().toUpperCase();

  return new Response(
    JSON.stringify({ valid: verdict === "VALID" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
