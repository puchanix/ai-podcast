
import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";

export const config = {
  api: {
    bodyParser: false,
  },
};

const IncomingForm = formidable.IncomingForm;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Error parsing form:", err);
      return res.status(500).json({ error: "Failed to parse form data" });
    }

    const file = files.audio;

    if (!file?.filepath || typeof file.filepath !== "string") {
      console.error("❌ Filepath missing or invalid:", file);
      return res.status(400).json({ error: "Invalid file path" });
    }

    try {
      const formData = new FormData();
      formData.append("file", fs.createReadStream(file.filepath), {
        filename: "input.webm",
        contentType: "audio/webm",
      });
      formData.append("model", "whisper-1");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.text) {
        console.error("❌ Whisper failed:", result);
        return res.status(502).json({ error: "Whisper transcription failed" });
      }

      console.log("✅ Transcribed text:", result.text);
      res.status(200).json({ text: result.text });
    } catch (error) {
      console.error("❌ Whisper API error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });
}

