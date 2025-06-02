export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { text } = req.body

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Feedback text is required" })
      }

      // Log feedback with clear markers for easy searching
      console.log("==========================================")
      console.log("============ FEEDBACK RECEIVED ==========")
      console.log("==========================================")
      console.log("Timestamp:", new Date().toISOString())
      console.log("Feedback:", text.trim())
      console.log("==========================================")

      res.status(200).json({ success: true, message: "Feedback submitted successfully" })
    } catch (error) {
      console.error("Error processing feedback:", error)
      res.status(500).json({ error: "Failed to submit feedback" })
    }
  } else if (req.method === "GET") {
    // For admin page - return empty array since we're not storing feedback
    res.status(200).json({ feedback: [] })
  } else {
    res.setHeader("Allow", ["POST", "GET"])
    res.status(405).json({ error: "Method not allowed" })
  }
}
