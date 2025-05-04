
import formidable from 'formidable';
import fs from 'fs';
import { Readable } from 'stream';
import FormData from 'form-data';
import fetch from 'node-fetch'; // Add this if not globally available

export const config = {
  api: {
    bodyParser: false,
  },
};

function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Formidable parse error:', err);
      return res.status(500).json({ error: 'Failed to parse form data' });
    }

    try {
      const file = files.audio;
      if (!file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const fileData = fs.readFileSync(file.filepath);
      const formData = new FormData();
      formData.append('file', fileData, {
        filename: 'recording.webm',
        contentType: 'audio/webm',
      });
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${errorText}`);
      }

      const result = await response.json();
      res.status(200).json({ question: result.text });
    } catch (error) {
      console.error('Transcription error:', error);
      res.status(500).json({ error: 'Failed to transcribe audio' });
    }
  });
}

