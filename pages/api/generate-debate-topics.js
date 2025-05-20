import { characters } from "../../data/characters"

export default async function handler(req, res) {
  try {
    const { character1, character2 } = req.body

    // Get character details
    const char1 = characters.find((c) => c.id === character1)
    const char2 = characters.find((c) => c.id === character2)

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // For simplicity, we'll return some predefined topics
    // In a real implementation, you would use AI to generate these
    const topics = [
      {
        id: "science-method",
        title: "Scientific Method",
        description: "Approaches to scientific discovery and experimentation",
        category: "science",
      },
      {
        id: "human-nature",
        title: "Human Nature",
        description: "The fundamental characteristics of humanity",
        category: "philosophy",
      },
      {
        id: "technology-progress",
        title: "Technological Progress",
        description: "The benefits and risks of advancing technology",
        category: "technology",
      },
      {
        id: "art-purpose",
        title: "Purpose of Art",
        description: "The role of artistic expression in society",
        category: "arts",
      },
      {
        id: "education-approach",
        title: "Education Methods",
        description: "How to best educate future generations",
        category: "philosophy",
      },
      {
        id: "historical-impact",
        title: "Historical Legacy",
        description: "How history shapes our present and future",
        category: "history",
      },
    ]

    return res.json({ topics })
  } catch (error) {
    console.error("Error generating debate topics:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
