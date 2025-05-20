export default function handler(req, res) {
    // Simply redirect to the silent.mp3 file
    res.setHeader("Content-Type", "audio/mpeg")
    res.redirect(307, "/silent.mp3")
  }
  