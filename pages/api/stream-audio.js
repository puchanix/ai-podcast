// pages/api/stream-audio.js
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Initialize the Text-to-Speech client
let textToSpeechClient;

try {
  // Try to initialize with credentials from environment variable
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON 
    ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    : null;
  
  textToSpeechClient = new TextToSpeechClient({
    credentials: credentials
  });
} catch (error) {
  console.error('Error initializing Text-to-Speech client:', error);
}

export default async function handler(req, res) {
  // Log the request details for debugging
  console.log('Stream audio request:', req.query);
  
  const { id, text, voice = 'en-US-Neural2-D' } = req.query;
  
  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  try {
    // Set CORS headers to allow audio playback from any origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set content type for audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Check if we have a valid client
    if (!textToSpeechClient) {
      console.error('Text-to-Speech client not initialized');
      
      // Fallback to a static test audio file
      const testAudioPath = path.join(process.cwd(), 'public', 'test-audio.mp3');
      
      if (fs.existsSync(testAudioPath)) {
        const audioBuffer = fs.readFileSync(testAudioPath);
        res.setHeader('Content-Length', audioBuffer.length);
        return res.send(audioBuffer);
      } else {
        // Generate a simple tone as a last resort
        const sampleRate = 44100;
        const duration = 2; // 2 seconds
        const frequency = 440; // A4 note
        
        // Create a buffer for a simple sine wave
        const audioBuffer = Buffer.alloc(sampleRate * duration * 2);
        
        for (let i = 0; i < sampleRate * duration; i++) {
          const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 32767;
          audioBuffer.writeInt16LE(Math.floor(sample), i * 2);
        }
        
        res.setHeader('Content-Length', audioBuffer.length);
        return res.send(audioBuffer);
      }
    }
    
    // Prepare the request for Google Text-to-Speech
    const request = {
      input: { text },
      voice: { languageCode: 'en-US', name: voice },
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 3.0 // Increase volume slightly
      },
    };
    
    console.log('Sending TTS request:', {
      text: text.substring(0, 50) + '...',
      voice,
      audioConfig: request.audioConfig
    });
    
    // Generate the audio
    const [response] = await textToSpeechClient.synthesizeSpeech(request);
    
    // Log the response size
    console.log(`Generated audio size: ${response.audioContent.length} bytes`);
    
    // Check if the audio is too small (likely empty or an error)
    if (response.audioContent.length < 1000) {
      console.warn('Warning: Generated audio is suspiciously small');
      
      // Try with a simpler text as fallback
      const fallbackRequest = {
        input: { text: 'This is a test of the text to speech system.' },
        voice: { languageCode: 'en-US', name: voice },
        audioConfig: { 
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 6.0 // Increase volume more for fallback
        },
      };
      
      const [fallbackResponse] = await textToSpeechClient.synthesizeSpeech(fallbackRequest);
      
      console.log(`Fallback audio size: ${fallbackResponse.audioContent.length} bytes`);
      
      // Set the content length header
      res.setHeader('Content-Length', fallbackResponse.audioContent.length);
      
      // Send the audio data
      return res.send(fallbackResponse.audioContent);
    }
    
    // Set the content length header
    res.setHeader('Content-Length', response.audioContent.length);
    
    // Send the audio data
    return res.send(response.audioContent);
    
  } catch (error) {
    console.error('Error generating audio:', error);
    
    // Try to send a static test audio file as fallback
    try {
      const testAudioPath = path.join(process.cwd(), 'public', 'test-audio.mp3');
      
      if (fs.existsSync(testAudioPath)) {
        const audioBuffer = fs.readFileSync(testAudioPath);
        res.setHeader('Content-Length', audioBuffer.length);
        return res.send(audioBuffer);
      }
    } catch (fallbackError) {
      console.error('Error sending fallback audio:', fallbackError);
    }
    
    return res.status(500).json({ error: 'Failed to generate audio' });
  }
}