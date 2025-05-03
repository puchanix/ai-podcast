export const config = {
    api: {
      bodyParser: false
    }
  };
  
  import { IncomingForm } from 'formidable';
  import { readFile } from 'fs/promises';
  import { buffer } from 'micro';
  
  export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const data = await new Promise((resolve, reject) => {
      const form = new IncomingForm({ keepExtensions: true });
      form.parse(req, async (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });
  
    const file = data.files.audio?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }
  
    try {
      const fileBuffer = await readFile(file.filepath);
      const blob = new Blob([fileBuffer], { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, file.originalFilename);
      formData.append('model', 'whisper-1');
  
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: formData
      });
  
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
  
      res.status(200).json({ transcript: result.text });
    } catch (err) {
      console.error('Transcription error:', err);
      res.status(500).json({ error: 'Transcription failed' });
    }
  }