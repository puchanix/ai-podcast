import { OpenAI } from 'openai';
import { Readable } from 'stream';
import Busboy from 'busboy';

export const config = {
  api: { bodyParser: false },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let audioBuffer = Buffer.alloc(0);

  const busboy = Busboy({ headers: req.headers });

  await new Promise((resolve, reject) => {
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      file.on('data', data => {
        audioBuffer = Buffer.concat([audioBuffer, data]);
      });
      file.on('end', () => resolve());
    });

    busboy.on('error', reject);
    req.pipe(busboy);
  });

  if (!audioBuffer.length) {
    return res.status(400).json({ error: 'No audio data received' });
  }

  try {
    const fileStream = Readable.from(audioBuffer);
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      filename: 'question.webm',
      mimetype: 'audio/webm',
    });

    return res.status(200).json({ transcript: transcription.text });
  } catch (error) {
    console.error('Whisper transcription failed:', error);
    return res.status(500).json({ error: error.message });
  }
}










  

