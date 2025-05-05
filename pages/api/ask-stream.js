
export default async function handler(req, res) {
  const question = req.query.question;
  console.log("🤖 Da Vinci received question:", question); // ✅

  if (!question) {
    return res.status(400).send("No question provided");
  }

  const prompt = `
You are Leonardo da Vinci. Answer the following question as if you were him. Be curious, poetic, and insightful. Keep it under 100 words.

Q: ${question}
A:`;

  const response = await fetch("https://api.openai.com/v1/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-davinci-003",
      prompt,
      temperature: 0.7,
      max_tokens: 200,
    }),
  });

  const data = await response.json();
  const answer = data.choices?.[0]?.text?.trim();

  if (!answer) {
    console.error("❌ No answer returned by GPT");
    return res.status(500).send("No answer");
  }

  console.log("🎯 Da Vinci answer:", answer);

  const ttsRes = await fetch("https://api.elevenlabs.io/v1/text-to-speech/YOUR_VOICE_ID/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: answer,
      voice_settings: { stability: 0.3, similarity_boost: 0.8 },
    }),
  });

  res.setHeader("Content-Type", "audio/mpeg");
  ttsRes.body.pipe(res);
}

