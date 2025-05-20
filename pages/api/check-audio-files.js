import fs from "fs"
import path from "path"

export default function handler(req, res) {
  const results = {
    silent_mp3: {
      exists: false,
      size: 0,
      error: null,
    },
    test_audio_wav: {
      exists: false,
      size: 0,
      error: null,
    },
  }

  try {
    // Check silent.mp3
    const silentPath = path.join(process.cwd(), "public", "silent.mp3")
    if (fs.existsSync(silentPath)) {
      const stats = fs.statSync(silentPath)
      results.silent_mp3.exists = true
      results.silent_mp3.size = stats.size
    }
  } catch (error) {
    results.silent_mp3.error = error.message
  }

  try {
    // Check test-audio.wav
    const testAudioPath = path.join(process.cwd(), "public", "test-audio.wav")
    if (fs.existsSync(testAudioPath)) {
      const stats = fs.statSync(testAudioPath)
      results.test_audio_wav.exists = true
      results.test_audio_wav.size = stats.size
    }
  } catch (error) {
    results.test_audio_wav.error = error.message
  }

  res.status(200).json({
    results,
    cwd: process.cwd(),
    publicDir: path.join(process.cwd(), "public"),
  })
}
