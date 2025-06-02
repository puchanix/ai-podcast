export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { text } = req.body

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Feedback text is required" })
      }

      // Send email using a simple email service
      const emailData = {
        to: "ariel@mastil.com",
        subject: "AI Heroes Feedback",
        text: `New feedback received:\n\n${text.trim()}\n\nTimestamp: ${new Date().toISOString()}`,
      }

      // Use Resend API (you'll need to add RESEND_API_KEY to your environment variables)
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "feedback@aiheroes.app", // You'll need to verify this domain with Resend
          to: "ariel@mastil.com",
          subject: "AI Heroes Feedback",
          text: `New feedback received:\n\n${text.trim()}\n\nTimestamp: ${new Date().toISOString()}`,
        }),
      })

      if (!emailResponse.ok) {
        console.error("Failed to send email:", await emailResponse.text())
        return res.status(500).json({ error: "Failed to send feedback" })
      }

      res.status(200).json({ success: true, message: "Feedback sent successfully" })
    } catch (error) {
      console.error("Error sending feedback:", error)
      res.status(500).json({ error: "Failed to send feedback" })
    }
  } else if (req.method === "GET") {
    // For admin page - return empty array since we're not storing feedback anymore
    res.status(200).json({ feedback: [] })
  } else {
    res.setHeader("Allow", ["GET", "POST"])
    res.status(405).json({ error: "Method not allowed" })
  }
}
