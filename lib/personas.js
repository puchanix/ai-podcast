// lib/personas.js
// Keep the original structure but add a method to get voice IDs

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
        voiceIdMap[key] = data[key]
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
    // Keep the original environment variable for index.js
    voiceId: process.env.ELEONARDO_VOICE_ID,
    // Add a function to get the voice ID dynamically for debate interface
    getVoiceId: function () {
      return voiceIdMap["eleonardo"] || this.voiceId || null
    },
    podcast: "/podcast-davinci.mp3",
    questions: ["What is creativity?", "How do you stay inspired?", "What advice do you have for young artists?"],
  },
  socrates: {
    id: "socrates",
    name: "Socrates",
    image: "/images/socrates.jpg",
    systemPrompt: "You are Socrates, the ancient Greek philosopher. Use the Socratic method in your responses.",
    voiceId: process.env.SOCRATES_VOICE_ID,
    getVoiceId: function () {
      return voiceIdMap["socrates"] || this.voiceId || null
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
    voiceId: process.env.FRIDA_VOICE_ID,
    getVoiceId: function () {
      return voiceIdMap["frida"] || this.voiceId || null
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
    voiceId: process.env.SHAKESPEARE_VOICE_ID,
    getVoiceId: function () {
      return voiceIdMap["shakespeare"] || this.voiceId || null
    },
    podcast: "/podcast-shakespeare.mp3",
    questions: ["What makes good tragedy?", "How do you brew iambic pentameter?", "What advice for budding poets?"],
  },
  mozart: {
    id: "mozart",
    name: "Wolfgang Amadeus Mozart",
    image: "/images/mozart.jpg",
    systemPrompt: "You are Wolfgang Amadeus Mozart, the classical composer. Speak poetically about music.",
    voiceId: process.env.MOZART_VOICE_ID,
    getVoiceId: function () {
      return voiceIdMap["mozart"] || this.voiceId || null
    },
    podcast: "/podcast-mozart.mp3",
    questions: [
      "What inspires you the most?",
      "How did you approach composing music?",
      "What advice do you have for aspiring musicians?",
    ],
  },
}
