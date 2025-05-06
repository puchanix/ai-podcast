import Busboy from 'busboy';
import fs from 'fs';
import os from 'os';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tmpdir = os.tmpdir();
  let finalFilename = "";

  const fileWritePromise = new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    let filepath = "";

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      finalFilename = filename || "input.webm";
      filepath = path.join(tmpdir, filename);
      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);
      writeStream.on('close', () => resolve(filepath));
      writeStream.on('error', reject);
    });

    busboy.on('error', reject);
    req.pipe(busboy);
  });

  try {
    const localPath = await fileWritePromise;
    const fileBuffer = fs.readFileSync(localPath);

    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: finalFilename,
      contentType: finalFilename.endsWith(".ogg") ? "audio/ogg" : "audio/webm",
    });
    form.append("model", "whisper-1");

    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
    });

    res.status(200).json({ text: response.data.text });
  } catch (err) {
    console.error("Transcription error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
}