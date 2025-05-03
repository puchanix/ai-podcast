export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { question } = req.body;
  
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are Leonardo da Vinci. Respond in his voice, curious and insightful. Be vivid and personal in tone."
            },
            {
              role: "user",
              content: question
            }
          ],
          temperature: 0.7
        })
      });
  
      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || "I'm not sure how to respond.";
      res.status(200).json({ answer });
    } catch (err) {
      console.error("Error from GPT:", err);
      res.status(500).json({ error: "Failed to get response from GPT" });
    }
  }