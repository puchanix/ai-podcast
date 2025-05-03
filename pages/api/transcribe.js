import { OpenAI } from 'openai';
import formidable from 'formidable';

export const config = {
  api: { bodyParser: false },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    fileWriteStreamHandler: () => null,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Form parsing failed' });
    }

    const file = files?.audio;

    if (!file || Array.isArray(file) || typeof file.toBuffer !== 'function') {
      console.error('Invalid audio file:', file);
      return res.status(400).json({ error: 'Invalid or missing audio file' });
    }

    try {
      const buffer = await file.toBuffer();
      const response = await openai.audio.transcriptions.create({
        file: buffer,
        model: 'whisper-1',
        filename: 'question.webm',
        mimetype: 'audio/webm',
      });

      return res.status(200).json({ transcript: response.text });
    } catch (error) {
      console.error('Whisper transcription failed:', error);
      return res.status(500).json({ error: error.message });
    }
  });
}








  

