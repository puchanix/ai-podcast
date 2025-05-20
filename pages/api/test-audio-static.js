export default function handler(req, res) {
  // Set the content type for audio
  res.setHeader("Content-Type", "audio/mpeg")

  // Return a simple response
  res.status(200).send("Audio data would be here")
}
