import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  console.log('🚀 Hit /api/transcribe');

  if (req.method !== 'POST') {
    console.log('⛔ Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('❌ Error parsing form:', err);
      return res.status(500).json({ error: 'Form parse error' });
    }

    console.log('✅ Form parsed:', Object.keys(files));

    try {
      const file = files.audio;
      if (!file) {
        console.log('❌ No audio file provided');
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
        console.error('❌ Whisper error:', msg);
        return res.status(500).json({ error: 'Whisper API error' });
      }

      const result = await response.json();
      console.log('✅ Whisper result:', result);
      return res.status(200).json({ question: result.text });
    } catch (err) {
      console.error('❌ Catch block error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  });
}


