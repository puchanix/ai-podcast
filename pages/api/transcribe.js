export const config = {
    api: {
      bodyParser: false
    }
  };
  
  import formidable from 'formidable';
  import fs from 'fs';
  
  export default async function handler(req, res) {
    const form = new formidable.IncomingForm();
  
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Formidable error:", err);
        return res.status(500).json({ error: "Form parsing failed" });
      }
  
      const audioFile = files.audio;
      if (!audioFile) {
        return res.status(400).json({ error: "No audio file received" });
      }
  
      const fileStream = fs.createReadStream(audioFile[0].filepath);
  
      try {
        const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: (() => {
            const data = new FormData();
            data.append("file", fileStream, audioFile[0].originalFilename);
            data.append("model", "whisper-1");
            return data;
          })()
        });
  
        const result = await openaiRes.json();
        if (result.error) throw new Error(result.error.message);
  
        res.status(200).json({ transcript: result.text });
      } catch (error) {
        console.error("Whisper API error:", error);
        res.status(500).json({ error: "Transcription failed" });
      }
    });
  }