export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from 'formidable';
import fs from 'fs';

async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
}

export default async function handler(req, res) {
  try {
    const files = await parseForm(req);
    const audio = files.audio;
    const fileBuffer = fs.readFileSync(audio.filepath);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: (() => {
        const formData = new FormData();
        formData.append("file", new Blob([fileBuffer], { type: "audio/webm" }), "audio.webm");
        formData.append("model", "whisper-1");
        return formData;
      })()
    });

    const result = await response.json();
    res.status(200).json({ transcript: result.text });
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
}
