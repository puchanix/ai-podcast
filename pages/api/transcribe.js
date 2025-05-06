
const formidable = require('formidable');
const FormData = require('form-data');
const fs = require('fs');

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log("🛠️ Received /api/transcribe POST request");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({});
  const [fields, files] = await form.parse(req);

  const file = files.audio;
  if (!file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    const buffer = await file.toBuffer(); // new in v3
    const formData = new FormData();
    formData.append('file', buffer, { filename: 'input.webm', contentType: 'audio/webm' });
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${errorText}`);
    }

    const result = await response.json();
    console.log("📝 Whisper transcript:", result.text);
    res.status(200).json({ text: result.text });
  } catch (err) {
    console.error("Transcription error:", err);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
}




