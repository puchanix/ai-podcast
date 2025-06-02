// AI Response Configuration
export const AI_CONFIG = {
  WORD_LIMIT: 50,
  TOKEN_LIMIT: 60,
  WORD_LIMIT_INSTRUCTION: "Keep your response under 50 words.",
}

// Server-safe character configuration that can be imported by API routes
export const personaConfig = {
  daVinci: {
    id: "daVinci",
    apiKey: "davinci", // Key used in API responses
    envVarName: "ELEONARDO_VOICE_ID",
    name: "Leonardo da Vinci",
  },
  socrates: {
    id: "socrates",
    apiKey: "socrates",
    envVarName: "SOCRATES_VOICE_ID",
    name: "Socrates",
  },
  frida: {
    id: "frida",
    apiKey: "frida",
    envVarName: "FRIDA_VOICE_ID",
    name: "Frida Kahlo",
  },
  shakespeare: {
    id: "shakespeare",
    apiKey: "shakespeare",
    envVarName: "SHAKESPEARE_VOICE_ID",
    name: "William Shakespeare",
  },
  mozart: {
    id: "mozart",
    apiKey: "mozart",
    envVarName: "MOZART_VOICE_ID",
    name: "Wolfgang Amadeus Mozart",
  },
}

// Character prompts for API use
export const characterPrompts = {
  daVinci:
    "You are Leonardo da Vinci, the great Renaissance polymath. Speak with curiosity about art, science, and invention. Be passionate but thoughtful.",
  socrates:
    "You are Socrates, the ancient Greek philosopher. Use the Socratic method, asking probing questions. Be wise but humble.",
  frida:
    "You are Frida Kahlo, the passionate Mexican artist. Speak with intensity about art, pain, love, and identity. Be bold and emotional.",
  shakespeare:
    "You are William Shakespeare, the Bard of Avon. Speak poetically but accessibly about human nature, love, and drama. Be eloquent.",
  mozart:
    "You are Wolfgang Amadeus Mozart, the classical composer. Speak passionately about music, creativity, and artistic expression. Be energetic.",
}

// This will be populated by the server
export let voiceIdsLoaded = false
export const voiceIdMap = {}

// Function to load voice IDs from the server
export async function loadVoiceIds() {
  try {
    const response = await fetch("/api/get-voice-ids")
    if (response.ok) {
      const data = await response.json()

      // Store all voice IDs in the map
      Object.keys(data).forEach((key) => {
        if (data[key]) {
          voiceIdMap[key] = data[key]
          console.log(`Stored voice ID in voiceIdMap: ${key} = ${data[key]}`)

          // Also update the personas directly
          const personaKey =
            key === "davinci" // Changed from "eleonardo" to "davinci"
              ? "daVinci"
              : key === "socrates"
                ? "socrates"
                : key === "frida"
                  ? "frida"
                  : key === "shakespeare"
                    ? "shakespeare"
                    : key === "mozart"
                      ? "mozart"
                      : null

          if (personaKey && personas[personaKey]) {
            personas[personaKey].voiceId = data[key]
            console.log(`Updated persona ${personaKey} with voice ID: ${data[key]}`)
          }
        }
      })

      voiceIdsLoaded = true
      console.log("Voice IDs loaded successfully:", voiceIdMap)
      return true
    } else {
      console.error("Failed to load voice IDs")
      return false
    }
  } catch (error) {
    console.error("Error loading voice IDs:", error)
    return false
  }
}

// Original personas object with backward compatibility
export const personas = {
  daVinci: {
    id: "daVinci",
    name: "Leonardo da Vinci",
    image: "/images/davinci.jpg",
    systemPrompt: "You are Leonardo da Vinci, the great Renaissance polymath. Answer concisely but thoughtfully.",
    prompt:
      "You are Leonardo da Vinci, the Renaissance polymath. You speak with curiosity about art, science, and invention. You often reference your observations of nature and your artistic works.",
    // Keep the original environment variable for index.js
    voiceId: process.env.ELEONARDO_VOICE_ID,
    // Add a function to get the voice ID dynamically for debate interface
    getVoiceId: function () {
      // Check voiceIdMap first
      if (voiceIdMap["davinci"]) {
        return voiceIdMap["davinci"]
      }
      // Then check direct voiceId property
      if (this.voiceId) {
        return this.voiceId
      }
      // Then check environment variable directly
      if (process.env.ELEONARDO_VOICE_ID) {
        return process.env.ELEONARDO_VOICE_ID
      }
      // Fallback
      return "echo"
    },
    podcast: "/podcast-davinci.mp3",
    questions: ["What is creativity?", "How do you stay inspired?", "What advice do you have for young artists?"],
  },
  socrates: {
    id: "socrates",
    name: "Socrates",
    image: "/images/socrates.jpg",
    systemPrompt: "You are Socrates, the ancient Greek philosopher. Use the Socratic method in your responses.",
    prompt:
      "You are Socrates, the classical Greek philosopher. You speak through questioning, seeking wisdom through dialogue. You often say you know nothing and guide others to discover truth.",
    voiceId: process.env.SOCRATES_VOICE_ID,
    getVoiceId: function () {
      if (voiceIdMap["socrates"]) {
        return voiceIdMap["socrates"]
      }
      if (this.voiceId) {
        return this.voiceId
      }
      if (process.env.SOCRATES_VOICE_ID) {
        return process.env.SOCRATES_VOICE_ID
      }
      return "echo"
    },
    podcast: "/podcast-socrates.mp3",
    questions: ["What is virtue?", "How should one live a good life?", "What is the nature of knowledge?"],
  },
  frida: {
    id: "frida",
    name: "Frida Kahlo",
    image: "/images/frida.jpg",
    systemPrompt:
      "You are Frida Kahlo, fiercely expressive Mexican artist who turned personal pain, identity, and love into bold, unforgettable self-portraits",
    prompt:
      "You are Frida Kahlo, the passionate Mexican artist. You speak with intensity about art, pain, love, and Mexican culture. You are direct and emotionally expressive.",
    voiceId: process.env.FRIDA_VOICE_ID,
    getVoiceId: function () {
      if (voiceIdMap["frida"]) {
        return voiceIdMap["frida"]
      }
      if (this.voiceId) {
        return this.voiceId
      }
      if (process.env.FRIDA_VOICE_ID) {
        return process.env.FRIDA_VOICE_ID
      }
      return "nova"
    },
    podcast: "/podcast-frida.mp3",
    questions: [
      "Did pain make your art more honest?",
      "What does identity mean to you?",
      "Can love and freedom live together?",
    ],
  },
  shakespeare: {
    id: "shakespeare",
    name: "William Shakespeare",
    image: "/images/shakespeare.jpg",
    systemPrompt: "You are William Shakespeare, the Bard of Avon. Respond in Early Modern English.",
    prompt:
      "You are William Shakespeare, the greatest playwright in English literature. You speak in eloquent, poetic language with wit and wisdom about human nature and the human condition.",
    voiceId: process.env.SHAKESPEARE_VOICE_ID,
    getVoiceId: function () {
      if (voiceIdMap["shakespeare"]) {
        return voiceIdMap["shakespeare"]
      }
      if (this.voiceId) {
        return this.voiceId
      }
      if (process.env.SHAKESPEARE_VOICE_ID) {
        return process.env.SHAKESPEARE_VOICE_ID
      }
      return "echo"
    },
    podcast: "/podcast-shakespeare.mp3",
    questions: ["What makes good tragedy?", "How do you brew iambic pentameter?", "What advice for budding poets?"],
  },
  mozart: {
    id: "mozart",
    name: "Wolfgang Amadeus Mozart",
    image: "/images/mozart.jpg",
    systemPrompt: "You are Wolfgang Amadeus Mozart, the classical composer. Speak poetically about music.",
    prompt:
      "You are Wolfgang Amadeus Mozart, the musical genius. You speak with passion about music, composition, and the divine nature of musical harmony. You are playful yet profound.",
    voiceId: process.env.MOZART_VOICE_ID,
    getVoiceId: function () {
      if (voiceIdMap["mozart"]) {
        return voiceIdMap["mozart"]
      }
      if (this.voiceId) {
        return this.voiceId
      }
      if (process.env.MOZART_VOICE_ID) {
        return process.env.MOZART_VOICE_ID
      }
      return "echo"
    },
    podcast: "/podcast-mozart.mp3",
    questions: [
      "What inspires you the most?",
      "How did you approach composing music?",
      "What advice do you have for aspiring musicians?",
    ],
  },
}
