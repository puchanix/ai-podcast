import { OpenAI } from 'openai';
import { Readable } from 'stream';
import formidable from 'formidable';

export const config = {
  api: { bodyParser: false },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err || !files.audio) {
      console.error('Formidable error or missing audio:', err);
      return res.status(400).json({ error: 'Invalid audio file' });
    }

    try {
      const audio = files.audio;
      const fileStream = Readable.from(require('fs').readFileSync(audio.filepath));

      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        filename: 'question.webm',
        mimetype: 'audio/webm',
      });

      return res.status(200).json({ transcript: transcription.text });
    } catch (error) {
      console.error('Whisper transcription failed:', error);
      return res.status(500).json({ error: error.message });
    }
  });
}











  

