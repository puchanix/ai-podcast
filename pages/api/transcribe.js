import Busboy from 'busboy';
import fs from 'fs';
import os from 'os';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false,
    // Increase the payload size limit for audio files
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tmpdir = os.tmpdir();
  let safeFilename = "";

  const fileWritePromise = new Promise((resolve, reject) => {
    const busboy = Busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max file size for mobile recordings
      }
    });
    let filepath = "";

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      safeFilename = typeof filename === 'string' ? filename : 'input.webm';
      filepath = path.join(tmpdir, safeFilename);

      console.log(`📥 Writing uploaded file to: ${filepath}`);
      console.log(`📊 File mimetype: ${mimetype}`);

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
    const fileSize = fileBuffer.length;
    
    console.log(`📦 Processing audio file: ${safeFilename}, size: ${fileSize} bytes`);

    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: safeFilename,
      contentType: safeFilename.endsWith(".ogg") ? "audio/ogg" : "audio/webm",
    });
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    // Add additional parameters for better transcription
    form.append("language", "en"); // Specify language
    form.append("temperature", "0.2"); // Lower temperature for more accurate transcription

    console.log('🔊 Sending audio to Whisper API...');
    
    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      form,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...form.getHeaders(),
        },
        // Increase timeout for larger files
        timeout: 60000,
      }
    );

    console.log("📑 Segments raw:", JSON.stringify(response.data.segments, null, 2));

    // ✅ Extract full transcript from segments
    const segments = response.data.segments || [];
    const fullTranscript = segments.map(s => s.text).join(" ").trim();

    console.log("📜 Full Whisper segments:", fullTranscript);
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(localPath);
    } catch (err) {
      console.error("⚠️ Failed to clean up temp file:", err);
    }

    res.status(200).json({ text: fullTranscript });
  } catch (err) {
    console.error("❌ Final transcription error:", err.response?.data || err.message);
    res.status(500).json({ 
      error: "Failed to transcribe audio",
      details: err.response?.data || err.message
    });
  }
}