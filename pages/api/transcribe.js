import { OpenAI } from 'openai';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Formidable parse error:', err);
      return res.status(400).json({ error: 'Error parsing audio file' });
    }

    const audioFile = files.audio;
    if (!audioFile || !audioFile[0] || !audioFile[0].filepath) {
      return res.status(400).json({ error: 'Invalid audio file' });
    }

    try {
      const file = fs.createReadStream(audioFile[0].filepath);

      const response = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        filename: 'question.webm',
        mimetype: 'audio/webm',
      });

      res.status(200).json({ transcript: response.text });
    } catch (error) {
      console.error('Whisper transcription failed:', error);
      res.status(500).json({ error: error.message });
    }
  });
}












  

