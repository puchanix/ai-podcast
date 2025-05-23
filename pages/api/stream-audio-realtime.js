import { pipeline } from "stream"
import { promisify } from "util"

const streamPipeline = promisify(pipeline)

export const config = {
  api: {
    responseLimit: false,
  },
}

async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const audioBufferChunks = []
      let totalLength = 0

      req.on("data", (chunk) => {
        audioBufferChunks.push(chunk)
        totalLength += chunk.length
      })

      req.on("end", async () => {
        try {
          const completeAudioBuffer = Buffer.concat(audioBufferChunks, totalLength)

          res.setHeader("Content-Type", "audio/mpeg")
          res.setHeader("Content-Length", completeAudioBuffer.length)
          res.setHeader("Cache-Control", "no-cache")
          res.setHeader("Connection", "keep-alive")
          res.setHeader("Transfer-Encoding", "chunked")

          try {
            await streamPipeline(completeAudioBuffer, res)
            console.log("Audio stream completed successfully.")
          } catch (pipelineError) {
            console.error("Pipeline failed:", pipelineError)
            // Fallback: Send the complete audio if streaming fails
            console.log("Fallback: Sending complete audio buffer.")
            res.write(completeAudioBuffer)
            res.end()
          }
        } catch (concatError) {
          console.error("Error concatenating audio buffers:", concatError)
          res.status(500).json({ error: "Failed to process audio data." })
        }
      })

      req.on("error", (error) => {
        console.error("Request error:", error)
        res.status(400).json({ error: "Bad request." })
      })
    } catch (error) {
      console.error("Error processing request:", error)
      res.status(500).json({ error: "Internal server error." })
    }
  } else {
    res.status(405).json({ error: "Method not allowed." })
  }
}

export default handler
