import { Readable } from 'stream';
import { OpenAI } from 'openai';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Formidable error:', err);
      return res.status(500).json({ error: 'Form parsing error' });
    }

    const file = files.audio;
    if (!file || Array.isArray(file)) {
      return res.status(400).json({ error: 'Invalid audio file' });
    }

    const buffer = await file.toBuffer?.(); // Vercel-compatible
    if (!buffer) {
      return res.status(500).json({ error: 'Failed to read audio buffer' });
    }

    try {
      const response = await openai.audio.transcriptions.create({
        file: buffer,
        model: 'whisper-1',
        filename: 'question.webm',
        mimetype: 'audio/webm',
      });

      return res.status(200).json({ transcript: response.text });
    } catch (e) {
      console.error('Whisper transcription failed:', e);
      return res.status(500).json({ error: e.message || 'Transcription error' });
    }
  });
}

