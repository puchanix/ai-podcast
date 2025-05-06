// pages/api/question-count.js
import { kv } from "@vercel/kv";

export const config = { runtime: "edge" };

export default async function handler(req) {
  try {
    let character = "daVinci";

    if (req.method === "GET") {
      const url = new URL(req.url);
      character = url.searchParams.get("character") || character;

      // Fetch counts from KV (Redis hash)
      const charCounts = (await kv.hgetall(`questions:${character}`)) || {};

      const questions = Object.entries(charCounts)
        .map(([question, count]) => ({ question, count: Number(count) }))
        .sort((a, b) => b.count - a.count);

      return new Response(JSON.stringify({ questions }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } else if (req.method === "POST") {
      const { character: char = character, question } = await req.json();
      if (!question) throw new Error("Missing question");

      // Increment the question count in KV
      await kv.hincrby(`questions:${char}`, question, 1);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Question-count handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}