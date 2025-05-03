import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const form = new IncomingForm({ uploadDir: '/tmp', keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err || !files.audio || !files.audio[0]) {
      console.error('Form parse error or missing audio file:', err);
      return res.status(400).json({ error: 'Invalid audio file' });
    }

    const filePath = files.audio[0].filepath;

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1',
      });

      res.status(200).json({ transcript: transcription.text });
    } catch (error) {
      console.error('Whisper transcription failed:', error);
      res.status(500).json({ error: 'Transcription failed' });
    }
  });
}













  

