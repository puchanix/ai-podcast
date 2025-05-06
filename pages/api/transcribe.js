
const Busboy = require('busboy');
const fs = require('fs');
const os = require('os');
const path = require('path');
const FormData = require('form-data');

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports.default = async function handler(req, res) {
  console.log('🛠️ /api/transcribe called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tmpdir = os.tmpdir();
  const filepath = path.join(tmpdir, `audio-${Date.now()}.webm`);

  const fileWritePromise = new Promise((resolve, reject) => {
    const busboy = new Busboy({ headers: req.headers });
    const stream = fs.createWriteStream(filepath);

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(`📥 Receiving file: ${filename}`);
      file.pipe(stream);
    });

    busboy.on('finish', () => {
      console.log('✅ Finished receiving file');
      stream.end(() => resolve(filepath));
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
      filename: 'input.webm',
      contentType: 'audio/webm',
    });
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText);
    }

    const result = await response.json();
    console.log('📝 Whisper transcript:', result.text);
    return res.status(200).json({ text: result.text });
  } catch (err) {
    console.error('❌ Final transcription error:', err);
    return res.status(500).json({ error: 'Failed to transcribe audio' });
  }
};




