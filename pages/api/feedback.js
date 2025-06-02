// Simple file-based storage for feedback
import fs from "fs"
import path from "path"

const FEEDBACK_FILE = path.join(process.cwd(), "data", "feedback.json")

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(FEEDBACK_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Read feedback from file
function readFeedback() {
  ensureDataDir()
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const data = fs.readFileSync(FEEDBACK_FILE, "utf8")
      return JSON.parse(data)
    }
  } catch (error) {
    console.error("Error reading feedback file:", error)
  }
  return []
}

// Write feedback to file
function writeFeedback(feedback) {
  ensureDataDir()
  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2))
  } catch (error) {
    console.error("Error writing feedback file:", error)
    throw error
  }
}

export default function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { text } = req.body

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Feedback text is required" })
      }

      const feedback = readFeedback()
      const newEntry = {
        text: text.trim(),
        timestamp: Date.now(),
        date: new Date().toISOString(),
      }

      feedback.push(newEntry)
      writeFeedback(feedback)

      res.status(200).json({ success: true, message: "Feedback submitted successfully" })
    } catch (error) {
      console.error("Error saving feedback:", error)
      res.status(500).json({ error: "Failed to save feedback" })
    }
  } else if (req.method === "GET") {
    try {
      const feedback = readFeedback()
      // Sort by timestamp, newest first
      feedback.sort((a, b) => b.timestamp - a.timestamp)
      res.status(200).json({ feedback })
    } catch (error) {
      console.error("Error reading feedback:", error)
      res.status(500).json({ error: "Failed to read feedback" })
    }
  } else if (req.method === "DELETE") {
    try {
      const { timestamp } = req.query

      if (!timestamp) {
        return res.status(400).json({ error: "Timestamp is required" })
      }

      const feedback = readFeedback()
      const filteredFeedback = feedback.filter((entry) => entry.timestamp !== Number.parseInt(timestamp))

      writeFeedback(filteredFeedback)
      res.status(200).json({ success: true, message: "Feedback deleted successfully" })
    } catch (error) {
      console.error("Error deleting feedback:", error)
      res.status(500).json({ error: "Failed to delete feedback" })
    }
  } else {
    res.setHeader("Allow", ["GET", "POST", "DELETE"])
    res.status(405).json({ error: "Method not allowed" })
  }
}
