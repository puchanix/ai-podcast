// pages/api/auto-continue.js
import { personas } from "../../lib/personas";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("auto-continue API called with:", JSON.stringify(req.body));
    
    const { character1, character2, currentMessages, topic, format, historicalContext } = req.body;
    
    // Get character details
    const char1 = personas[character1];
    const char2 = personas[character2];

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" });
    }

    // Generate placeholder responses
    const response1 = `Building on our discussion about "${topic}", I, ${char1.name}, would like to emphasize that this topic has profound implications for how we understand the world. My research has consistently shown that careful observation and methodical experimentation lead to the most reliable conclusions.`;
    const response2 = `While I appreciate ${char1.name}'s methodical approach, I, ${char2.name}, believe we must also consider the human element in this discussion. The topic of "${topic}" cannot be reduced to mere formulas or experiments. There is an artistic and intuitive dimension that must be acknowledged.`;

    // Use absolute URLs for audio files to avoid path issues
    const audioUrl1 = "/silent.mp3";
    const audioUrl2 = "/silent.mp3";

    console.log("Returning response with:", { response1, response2 });
    
    return res.status(200).json({
      response1,
      response2,
      audioUrl1,
      audioUrl2,
    });
  } catch (error) {
    console.error("Error in auto-continue API:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message,
      stack: error.stack 
    });
  }
}