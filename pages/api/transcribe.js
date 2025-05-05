import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).json({ error: 'Parse error' });
    }

    try {
      const file = files.audio;
      if (!file) {
        return res.status(400).json({ error: 'No audio file' });
      }

      const buffer = fs.readFileSync(file.filepath);

      const data = new FormData();
      data.append('file', buffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm',
      });
      data.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...data.getHeaders(),
        },
        body: data,
      });

      if (!response.ok) {
        const msg = await response.text();
        console.error('OpenAI error:', msg);
        return res.status(500).json({ error: 'OpenAI Whisper failed' });
      }

      const result = await response.json();
      return res.status(200).json({ question: result.text });
    } catch (err) {
      console.error('Transcription error:', err);
      return res.status(500).json({ error: 'Transcription error' });
    }
  });
}

