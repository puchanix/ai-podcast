
import { IncomingForm } from "formidable";
import fs from "fs";
import FormData from "form-data";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log("⚡ Incoming /api/transcribe request");

  if (req.method !== "POST") {
    console.warn("⚠️ Rejected non-POST method");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    console.log("📥 Inside form.parse");

    if (err) {
      console.error("❌ Formidable parse error:", err);
      return res.status(500).json({ error: "Failed to parse form data" });
    }

    console.log("🧾 Parsed files:", files);

    const file = files.audio;

    if (!file?.filepath || typeof file.filepath !== "string") {
      console.error("❌ Filepath missing or invalid:", file);
      return res.status(400).json({ error: "Invalid file path" });
    }

    try {
      const formData = new FormData();
      const fileStream = fs.createReadStream(file.filepath);

      formData.append("file", fileStream, {
        filename: "recording.webm",
        contentType: "audio/webm",
      });
      formData.append("model", "whisper-1");

      console.log("📤 Sending audio to OpenAI Whisper...");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      const raw = await response.text();
      console.log("📥 Raw response from OpenAI:", raw);

      let result;
      try {
        result = JSON.parse(raw);
      } catch (jsonErr) {
        console.error("❌ Failed to parse OpenAI JSON:", raw);
        return res.status(502).json({ error: "Invalid response from OpenAI Whisper API" });
      }

      if (!response.ok) {
        console.error("❌ OpenAI Whisper API error:", result);
        return res.status(response.status).json({ error: result.error || "OpenAI API error" });
      }

      if (!result.text) {
        console.error("❌ Whisper returned no transcription text:", result);
        return res.status(502).json({ error: "No text returned from Whisper" });
      }

      console.log("✅ Transcription successful:", result.text);
      res.status(200).json({ text: result.text });
    } catch (error) {
      console.error("❌ Transcription error (outer catch):", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });
}






