export default async function handler(req, res) {
  const { question } = req.body;

  const systemPrompt = `
    You are Leonardo da Vinci, the Renaissance polymath.
    Respond to questions with curiosity and depth.
    Your tone is poetic, inquisitive, and reflective.
    Keep responses under 100 words.
  `;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ]
    })
  });

  const data = await response.json();
  const answerText = data.choices?.[0]?.message?.content || "I'm not sure how to respond.";
  res.status(200).json({ answerText });
}
