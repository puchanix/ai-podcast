
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Missing question' });

  try {
    let fullText = '';
    let elevenResponse = null;
    let firstChunk = '';

    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: \`You are Leonardo da Vinci. Respond to each question as he would, in first person, with poetic curiosity, scientific depth, and Renaissance flair. Keep your answers under 100 words.\`,
        },
        { role: 'user', content: question },
      ],
      temperature: 0.8,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        if (!elevenResponse && fullText.split(' ').length > 30) {
          firstChunk = fullText.trim();
          // Send to ElevenLabs
          elevenResponse = await fetch(\`https://api.elevenlabs.io/v1/text-to-speech/\${VOICE_ID}\`, {
            method: 'POST',
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: firstChunk,
              model_id: 'eleven_monolingual_v1',
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
          });
        }
      }
    }

    let audioUrl = null;
    if (elevenResponse?.ok) {
      const buffer = await elevenResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      audioUrl = \`data:audio/mpeg;base64,\${base64}\`;
    }

    return res.status(200).json({ answer: fullText.trim(), audioUrl });
  } catch (err) {
    console.error('Streaming ask error:', err);
    return res.status(500).json({ error: 'Failed to generate response' });
  }
}
