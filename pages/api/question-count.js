// pages/api/question-count.js
// Simple in-memory store for demo purposes. For production, replace with a persistent database.
const counts = {};

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const character = url.searchParams.get("character") || "daVinci";
    const charCounts = counts[character] || {};
    const sorted = Object.entries(charCounts)
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count);
    return new Response(JSON.stringify({ questions: sorted }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } else if (req.method === "POST") {
    try {
      const { character = "daVinci", question } = await req.json();
      if (!question) throw new Error("Missing question");
      counts[character] = counts[character] || {};
      counts[character][question] = (counts[character][question] || 0) + 1;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  } else {
    return new Response("Method Not Allowed", { status: 405 });
  }
}
