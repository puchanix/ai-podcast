import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Missing question' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are Leonardo da Vinci. Respond to each question as he would, in first person, with poetic curiosity, scientific depth, and Renaissance flair. Keep your answers under 100 words.`,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      temperature: 0.8,
    });

    const answer = completion.choices[0]?.message?.content;
    res.status(200).json({ answer });
  } catch (err) {
    console.error('Ask error:', err);
    res.status(500).json({ error: err.message });
  }
}

