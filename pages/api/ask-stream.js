
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

export const config = {
  api: {
    responseLimit: false, // allow audio streaming
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { question } = req.body;
  if (!question) return res.status(400).end('Missing question');

  try {
    let fullText = '';

    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are Leonardo da Vinci. Respond to each question as he would, in first person, with poetic curiosity, scientific depth, and Renaissance flair. Keep your answers under 100 words.',
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
      }
    }

    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: fullText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!ttsRes.ok || !ttsRes.body) {
      const error = await ttsRes.text();
      console.error('TTS streaming error:', error);
      return res.status(500).end('TTS streaming failed');
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    ttsRes.body.pipe(res);
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).end('Internal Server Error');
  }
}
