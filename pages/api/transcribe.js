import { OpenAI } from 'openai';
import Busboy from 'busboy';
import { Writable } from 'stream';

export const config = {
  api: { bodyParser: false },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const busboy = Busboy({ headers: req.headers });
  let audioBuffer = Buffer.alloc(0);

  await new Promise((resolve, reject) => {
    busboy.on('file', (fieldname, file) => {
      const writable = new Writable({
        write(chunk, encoding, callback) {
          audioBuffer = Buffer.concat([audioBuffer, chunk]);
          callback();
        },
      });
      file.pipe(writable);
    });

    busboy.on('finish', resolve);
    busboy.on('error', reject);
    req.pipe(busboy);
  });

  if (!audioBuffer || audioBuffer.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty audio file' });
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: 'whisper-1',
      filename: 'question.webm',
      mimetype: 'audio/webm',
    });

    return res.status(200).json({ transcript: transcription.text });
  } catch (err) {
    console.error('Whisper transcription failed:', err);
    return res.status(500).json({ error: err.message });
  }
}









  

