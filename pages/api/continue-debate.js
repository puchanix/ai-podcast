// pages/api/continue-debate.js
import { personas } from "../../lib/personas";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("continue-debate API called with:", JSON.stringify(req.body));
    
    const { character1, character2, userQuestion, currentMessages, format, historicalContext } = req.body;
    
    // Get character details
    const char1 = personas[character1];
    const char2 = personas[character2];

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" });
    }

    // Generate placeholder responses
    const response1 = `That's an excellent question. As ${char1.name}, I would say that ${userQuestion} relates directly to my work on understanding the natural world. My approach has always been to observe carefully and draw conclusions based on evidence.`;
    const response2 = `I find ${char1.name}'s perspective interesting, but I, ${char2.name}, would add that ${userQuestion} must also be considered in light of broader societal implications. My experience has taught me that context matters tremendously in such discussions.`;

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
    console.error("Error in continue-debate API:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message,
      stack: error.stack 
    });
  }
}