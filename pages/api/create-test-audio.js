// pages/api/create-test-audio.js
import fs from 'fs';
import path from 'path';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

export default async function handler(req, res) {
  try {
    // Initialize the Text-to-Speech client
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON 
      ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      : null;
    
    const textToSpeechClient = new TextToSpeechClient({
      credentials: credentials
    });
    
    // Prepare the request
    const request = {
      input: { text: 'This is a test audio file for the AI Podcast application.' },
      voice: { languageCode: 'en-US', name: 'en-US-Neural2-D' },
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 6.0 // Increase volume
      },
    };
    
    // Generate the audio
    const [response] = await textToSpeechClient.synthesizeSpeech(request);
    
    // Save the audio file
    const outputPath = path.join(process.cwd(), 'public', 'test-audio.mp3');
    fs.writeFileSync(outputPath, response.audioContent);
    
    res.status(200).json({ 
      success: true, 
      message: 'Test audio file created successfully',
      path: '/test-audio.mp3',
      size: response.audioContent.length
    });
    
  } catch (error) {
    console.error('Error creating test audio:', error);
    res.status(500).json({ error: 'Failed to create test audio file' });
  }
}