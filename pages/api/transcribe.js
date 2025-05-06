
import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log("🛠️ /api/transcribe called");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({ uploadDir: '/tmp', keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Formidable error:", err);
      return res.status(500).json({ error: 'Form parsing failed' });
    }

    const file = files.audio;
    if (!file || !file.filepath) {
      console.error("🚫 No file uploaded");
      return res.status(400).json({ error: 'No file found' });
    }

    try {
      const fileBuffer = fs.readFileSync(file.filepath);
      const formData = new FormData();
      formData.append('file', fileBuffer, { filename: 'input.webm', contentType: 'audio/webm' });
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();
      console.log("📝 Transcription:", result.text);
      return res.status(200).json({ text: result.text });
    } catch (err) {
      console.error("❌ Whisper API failed:", err);
      return res.status(500).json({ error: 'Failed to transcribe audio' });
    }
  });
}



