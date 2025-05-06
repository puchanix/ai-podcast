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
  console.log('🛠️ /api/transcribe called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tmpdir = os.tmpdir();
  const filepath = path.join(tmpdir, `audio-${Date.now()}.ogg`);

  const fileWritePromise = new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const writeStream = fs.createWriteStream(filepath);

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(`📥 Receiving file: ${filename}`);
      file.pipe(writeStream);
    });

    busboy.on('finish', () => {
      console.log('✅ Finished receiving file');
      resolve(filepath);
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

    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: 'input.ogg',
      contentType: 'audio/ogg',
    });
    formData.append('model', 'whisper-1');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
      }
    );

    console.log('📝 Whisper transcript:', response.data.text);
    res.status(200).json({ text: response.data.text });
  } catch (err) {
    console.error('❌ Final transcription error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
}