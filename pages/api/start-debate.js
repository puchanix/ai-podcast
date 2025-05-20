// pages/api/start-debate.js
import { personas } from "../../lib/personas";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("start-debate API called with:", JSON.stringify(req.body));
    
    const { character1, character2, topic, format, historicalContext } = req.body;
    
    // Get character details
    const char1 = personas[character1];
    const char2 = personas[character2];

    console.log("Character 1:", character1, char1 ? "found" : "not found");
    console.log("Character 2:", character2, char2 ? "found" : "not found");

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" });
    }

    // Generate placeholder responses
    const opening1 = `As ${char1.name}, I would approach the topic of "${topic}" by considering the fundamental principles that have guided my work. This subject is fascinating because it touches on the core of human understanding and progress.`;
    const opening2 = `From my perspective as ${char2.name}, I see "${topic}" through a different lens. While I appreciate ${char1.name}'s approach, I believe we must also consider the practical implications and historical context of this matter.`;

    // Use absolute URLs for audio files to avoid path issues
    const audioUrl1 = "/silent.mp3";
    const audioUrl2 = "/silent.mp3";

    console.log("Returning response with:", { opening1, opening2 });
    
    return res.status(200).json({
      opening1,
      opening2,
      audioUrl1,
      audioUrl2,
    });
  } catch (error) {
    console.error("Error in start-debate API:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message,
      stack: error.stack 
    });
  }
}