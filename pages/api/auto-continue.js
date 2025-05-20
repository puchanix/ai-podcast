import { personas } from "../lib/personas"
export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const { character1, character2, currentMessages, topic, format, historicalContext } = req.body;
  
      // Get character details from your data source
      const char1 = characters.find((c) => c.id === character1);
      const char2 = characters.find((c) => c.id === character2);
  
      if (!char1 || !char2) {
        return res.status(400).json({ error: "Character not found" });
      }
  
      // In a real implementation, you would use AI to generate these responses based on the conversation history
      // For now, we'll return placeholder text
      const response1 = `Building on our discussion about "${topic}", I, ${char1.name}, would like to emphasize that this topic has profound implications for how we understand the world. My research has consistently shown that careful observation and methodical experimentation lead to the most reliable conclusions.`;
  
      const response2 = `While I appreciate ${char1.name}'s methodical approach, I, ${char2.name}, believe we must also consider the human element in this discussion. The topic of "${topic}" cannot be reduced to mere formulas or experiments. There is an artistic and intuitive dimension that must be acknowledged.`;
  
      // Generate audio using our TTS endpoint
      let audioUrl1 = "/silent.mp3";
      let audioUrl2 = "/silent.mp3";
  
      try {
        // Generate audio for character 1
        const ttsResponse1 = await fetch(
          `/api/debate-tts`, // Using relative URL
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: response1,
              characterId: character1,
            }),
          }
        );
  
        if (ttsResponse1.ok) {
          const ttsData1 = await ttsResponse1.json();
          audioUrl1 = ttsData1.audioUrl;
        }
  
        // Generate audio for character 2
        const ttsResponse2 = await fetch(
          `/api/debate-tts`, // Using relative URL
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: response2,
              characterId: character2,
            }),
          }
        );
  
        if (ttsResponse2.ok) {
          const ttsData2 = await ttsResponse2.json();
          audioUrl2 = ttsData2.audioUrl;
        }
      } catch (error) {
        console.error("Error generating TTS:", error);
        // Use fallback audio if TTS fails
      }
  
      return res.status(200).json({
        response1,
        response2,
        audioUrl1,
        audioUrl2,
      });
    } catch (error) {
      console.error("Error auto-continuing debate:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }