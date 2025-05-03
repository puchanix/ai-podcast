export const config = {
    api: {
      bodyParser: false
    }
  };
  
  import { IncomingForm } from 'formidable';
  import fs from 'fs';
  
  export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const data = await new Promise((resolve, reject) => {
      const form = new IncomingForm({ keepExtensions: true });
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });
  
    const file = data.files.audio?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }
  
    console.log("Received audio file:");
    console.log("Name:", file.originalFilename);
    console.log("Type:", file.mimetype);
    console.log("Path:", file.filepath);
  
    try {
      const fileStream = fs.createReadStream(file.filepath);
      const formData = new FormData();
      formData.append('file', fileStream, file.originalFilename);
      formData.append('model', 'whisper-1');
  
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: formData
      });
  
      const result = await response.json();
  
      if (result.error) {
        console.error("OpenAI Whisper error:", result.error);
        return res.status(500).json({ error: result.error.message });
      }
  
      console.log("Whisper transcript result:", result.text);
      res.status(200).json({ transcript: result.text });
    } catch (err) {
      console.error("Whisper transcription failed:", err);
      res.status(500).json({ error: 'Transcription failed' });
    }
  }