// Define personas directly in the API file to avoid import issues
const personas = {
    daVinci: {
      id: "daVinci",
      name: "Leonardo da Vinci",
      voiceId: process.env.ELEONARDO_VOICE_ID,
    },
    socrates: {
      id: "socrates",
      name: "Socrates",
      voiceId: process.env.SOCRATES_VOICE_ID,
    },
    frida: {
      id: "frida",
      name: "Frida Kahlo",
      voiceId: process.env.FRIDA_VOICE_ID,
    },
    shakespeare: {
      id: "shakespeare",
      name: "William Shakespeare",
      voiceId: process.env.SHAKESPEARE_VOICE_ID,
    },
    mozart: {
      id: "mozart",
      name: "Wolfgang Amadeus Mozart",
      voiceId: process.env.MOZART_VOICE_ID,
    },
  }
  
  export default async function handler(req, res) {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" })
    }
  
    try {
      const voiceIds = {}
  
      // Map persona IDs to environment variable keys
      const envKeyMap = {
        daVinci: "davinci", // This will be the key in the response
        socrates: "socrates",
        frida: "frida",
        shakespeare: "shakespeare",
        mozart: "mozart",
      }
  
      // Get voice IDs from environment variables
      Object.keys(personas).forEach((personaKey) => {
        const persona = personas[personaKey]
        const envKey = envKeyMap[personaKey]
  
        if (persona.voiceId && envKey) {
          voiceIds[envKey] = persona.voiceId
          console.log(`Voice ID for ${envKey}: ${persona.voiceId}`)
        }
      })
  
      console.log("All voice IDs:", voiceIds)
  
      return res.status(200).json(voiceIds)
    } catch (error) {
      console.error("Error getting voice IDs:", error)
      return res.status(500).json({ error: "Failed to get voice IDs" })
    }
  }
  