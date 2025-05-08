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
  let safeFilename = "";

  const fileWritePromise = new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    let filepath = "";

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      // SAFELY resolve filename
      safeFilename = typeof filename === 'string' ? filename : 'input.webm';
      filepath = path.join(tmpdir, safeFilename);

      console.log(`📥 Writing uploaded file to: ${filepath}`);

      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);
      writeStream.on('close', () => resolve(filepath));
      writeStream.on('error', reject);
    });

    busboy.on('error', (err) => {
      console.error('❌ Busboy error:', err);
      reject(err);
    });

    req.pipe(busboy);
  });

  try {
    const localPath = await fileWritePromise;
    const fileBuffer = fs.readFileSync(localPath);

    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: safeFilename,
      contentType: safeFilename.endsWith(".ogg") ? "audio/ogg" : "audio/webm",
    });
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    console.log("📜 Full Whisper segments:", response.data.segments);


    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
        
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
    });
    console.log("📜 Full transcript from Whisper:", response.data.text);

    console.log("📜 Full transcript:", response.data.text);

    res.status(200).json({ text: response.data.text });
  } catch (err) {
    console.error("❌ Final transcription error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
}
