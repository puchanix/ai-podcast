// Static topics to avoid API calls and delays
const staticTopics = [
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
      id: "education-methods",
      title: "Education Methods",
      description: "How to best educate future generations",
      category: "education",
    },
    {
      id: "historical-legacy",
      title: "Historical Legacy",
      description: "How history shapes our present and future",
      category: "history",
    },
  ]
  
  export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }
  
    // Simply return the static topics without any API calls
    // This removes the delay in "generating topics"
    return res.status(200).json({ topics: staticTopics })
  }
  