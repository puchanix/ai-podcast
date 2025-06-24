import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Enhanced static topics as fallback
const staticTopics = [
  {
    id: "consciousness-nature",
    title: "The Nature of Consciousness",
    description: "What defines consciousness and can machines achieve it?",
    category: "philosophy",
  },
  {
    id: "art-vs-science",
    title: "Art vs Science as Truth",
    description: "Which better reveals fundamental truths about existence?",
    category: "philosophy",
  },
  {
    id: "individual-vs-society",
    title: "Individual Freedom vs Social Order",
    description: "How much personal freedom should society allow?",
    category: "politics",
  },
  {
    id: "progress-vs-tradition",
    title: "Progress vs Tradition",
    description: "Should we embrace change or preserve established ways?",
    category: "culture",
  },
  {
    id: "knowledge-vs-wisdom",
    title: "Knowledge vs Wisdom",
    description: "Is accumulating facts more valuable than understanding meaning?",
    category: "philosophy",
  },
  {
    id: "emotion-vs-reason",
    title: "Emotion vs Reason in Decision Making",
    description: "Should we trust our hearts or our minds when making choices?",
    category: "psychology",
  },
  {
    id: "fate-vs-free-will",
    title: "Fate vs Free Will",
    description: "Are our lives predetermined or do we shape our own destiny?",
    category: "philosophy",
  },
  {
    id: "beauty-objective",
    title: "Is Beauty Objective or Subjective?",
    description: "Does true beauty exist independently of the observer?",
    category: "aesthetics",
  },
]

// Topic generation prompts for different categories
const topicPrompts = {
  philosophical:
    "Generate a thought-provoking philosophical debate topic that would engage great thinkers throughout history. Focus on fundamental questions about existence, knowledge, ethics, or reality.",

  scientific:
    "Create a debate topic about scientific discovery, methodology, or the relationship between science and society that would interest both ancient and modern minds.",

  artistic:
    "Suggest a debate topic about the nature of art, creativity, beauty, or artistic expression that could engage artists and philosophers across different eras.",

  social:
    "Generate a debate topic about human society, governance, justice, or social organization that would be relevant across different historical periods.",

  existential:
    "Create a deep debate topic about the meaning of life, death, purpose, or human existence that would resonate with great thinkers.",

  ethical:
    "Suggest a moral or ethical debate topic that explores right and wrong, virtue, or moral decision-making across cultures and time periods.",
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { useAI = true, count = 6 } = req.body

    // If AI is disabled or no API key, return static topics
    if (!useAI || !process.env.OPENAI_API_KEY) {
      const shuffledTopics = [...staticTopics].sort(() => Math.random() - 0.5)
      return res.status(200).json({
        topics: shuffledTopics.slice(0, count),
        source: "static",
      })
    }

    // Generate AI topics
    const categories = Object.keys(topicPrompts)
    const selectedCategories = categories.sort(() => Math.random() - 0.5).slice(0, Math.min(count, categories.length))

    const aiTopics = await Promise.all(
      selectedCategories.map(async (category) => {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a master debate moderator creating engaging topics for historical figures to debate. Generate topics that would create passionate, intellectual discussions between great minds across different eras.`,
              },
              {
                role: "user",
                content: `${topicPrompts[category]}

Return your response in this exact JSON format:
{
  "title": "Brief, compelling debate topic (max 8 words)",
  "description": "Engaging description that frames the debate (max 15 words)",
  "category": "${category}"
}`,
              },
            ],
            max_tokens: 150,
            temperature: 0.9,
          })

          const response = completion.choices[0]?.message?.content?.trim()
          if (!response) throw new Error("Empty response")

          // Try to parse JSON response
          const topicData = JSON.parse(response)

          return {
            id: `ai-${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: topicData.title || `${category.charAt(0).toUpperCase() + category.slice(1)} Debate`,
            description: topicData.description || "An engaging philosophical discussion",
            category: topicData.category || category,
          }
        } catch (error) {
          console.error(`Error generating ${category} topic:`, error)
          // Return a fallback topic for this category
          const fallback = staticTopics.find((t) => t.category === category) || staticTopics[0]
          return {
            ...fallback,
            id: `fallback-${category}-${Date.now()}`,
          }
        }
      }),
    )

    // Mix AI topics with some static ones for variety
    const staticSample = staticTopics
      .filter((topic) => !aiTopics.some((ai) => ai.category === topic.category))
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(0, count - aiTopics.length))

    const allTopics = [...aiTopics, ...staticSample].sort(() => Math.random() - 0.5).slice(0, count)

    return res.status(200).json({
      topics: allTopics,
      source: "mixed",
    })
  } catch (error) {
    console.error("Error generating debate topics:", error)

    // Fallback to static topics on any error
    const shuffledTopics = [...staticTopics].sort(() => Math.random() - 0.5)
    const count = 6 // Declare count variable here
    return res.status(200).json({
      topics: shuffledTopics.slice(0, count),
      source: "static_fallback",
    })
  }
}
