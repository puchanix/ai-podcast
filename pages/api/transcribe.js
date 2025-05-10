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
  let isIOS = false;

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

    busboy.on('field', (fieldname, val) => {
      if (fieldname === 'isIOS' && val === 'true') {
        isIOS = true;
        console.log('📱 iOS device detected');
      }
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
    
    console.log(`📦 Processing audio file: ${safeFilename}, size: ${fileSize} bytes, iOS: ${isIOS}`);

    // If file is too small, it might be corrupted
    if (fileSize < 1000) {
      console.error('❌ Audio file too small, likely corrupted');
      return res.status(400).json({ error: 'Audio file too small or corrupted' });
    }

    const form = new FormData();
    
    // For iOS, we need to convert the audio to a format Whisper accepts
    if (isIOS) {
      // Use .m4a extension for iOS recordings
      const newFilename = 'recording.m4a';
      
      form.append("file", fileBuffer, {
        filename: newFilename,
        contentType: 'audio/mp4a-latm', // Specific MIME type for iOS audio
      });
      
      console.log(`📱 iOS audio: renamed to ${newFilename} with MIME type audio/mp4a-latm`);
    } else {
      // For non-iOS, use the original approach
      form.append("file", fileBuffer, {
        filename: safeFilename,
        contentType: safeFilename.endsWith(".ogg") ? "audio/ogg" : "audio/webm",
      });
    }
    
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("language", "en");
    form.append("temperature", "0.2");

    console.log(`🔊 Sending audio to Whisper API...`);
    
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

    // Check if we got a valid response
    if (!response.data || !response.data.segments) {
      console.error('❌ Invalid response from Whisper API:', response.data);
      return res.status(500).json({ error: 'Invalid response from transcription service' });
    }

    console.log("📑 Segments count:", response.data.segments.length);

    // ✅ Extract full transcript from segments
    const segments = response.data.segments || [];
    const fullTranscript = segments.map(s => s.text).join(" ").trim();

    console.log("📜 Full Whisper transcript:", fullTranscript);
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(localPath);
    } catch (err) {
      console.error("⚠️ Failed to clean up temp file:", err);
    }

    res.status(200).json({ text: fullTranscript });
  } catch (err) {
    console.error("❌ Final transcription error:", err.response?.data || err.message);
    
    // More detailed error response
    const errorDetails = err.response?.data || {};
    const errorMessage = errorDetails.error?.message || err.message || 'Unknown error';
    
    res.status(500).json({ 
      error: "Failed to transcribe audio",
      message: errorMessage,
      details: errorDetails
    });
  }
}