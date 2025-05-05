
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('❌ Formidable parse error:', err);
      return res.status(500).json({ error: 'Failed to parse form data' });
    }

    try {
      const file = files.audio;
      if (!file) {
        console.error('❌ No audio file found in request');
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const formData = new FormData();
      formData.append('file', fs.createReadStream(file.filepath), {
        filename: 'recording.webm',
        contentType: 'audio/webm',
      });
      formData.append('model', 'whisper-1');

      const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      const raw = await openaiRes.text();
      let result;

      try {
        result = JSON.parse(raw);
      } catch (jsonErr) {
        console.error('❌ Failed to parse OpenAI JSON:', raw);
        throw new Error('OpenAI did not return valid JSON');
      }

      if (!openaiRes.ok) {
        console.error('❌ OpenAI API error:', result);
        return res.status(openaiRes.status).json({ error: result.error || 'OpenAI API error' });
      }

      console.log('✅ OpenAI Whisper success:', result);
      res.status(200).json({ text: result.text });
    } catch (error) {
      console.error('❌ Transcription error (outer catch):', error);
      res.status(500).json({ error: 'Failed to transcribe audio' });
    }
  });
}



