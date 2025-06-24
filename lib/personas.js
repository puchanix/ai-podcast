// AI Response Configuration
// AI Response Configuration
export const AI_CONFIG = {
  QUESTION: {
    WORD_LIMIT: 80,
    TOKEN_LIMIT: 110,
    WORD_LIMIT_INSTRUCTION: "IMPORTANT: Keep your response under 80 words and finish your last sentence completely.",
  },
  DEBATE: {
    WORD_LIMIT: 50,
    TOKEN_LIMIT: 80,
    WORD_LIMIT_INSTRUCTION: "IMPORTANT: Keep your response under 50 words and finish your last sentence completely.",
  }
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
  twain: {
    id: "twain",
    apiKey: "twain",
    envVarName: "TWAIN_VOICE_ID",
    name: "Mark Twain",
  },
  freud: {
    id: "freud",
    apiKey: "freud",
    envVarName: "FREUD_VOICE_ID",
    name: "Sigmund Freud",
  },
  spinoza: {
    id: "spinoza",
    apiKey: "spinoza",
    envVarName: "SPINOZA_VOICE_ID",
    name: "Baruch Spinoza",
  },
  hypatia: {
    id: "hypatia",
    apiKey: "hypatia",
    envVarName: "HYPATIA_VOICE_ID",
    name: "Hypatia of Alexandria",
  },
  gandhi: {
    id: "gandhi",
    apiKey: "gandhi",
    envVarName: "GANDHI_VOICE_ID",
    name: "Mahatma Gandhi",
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
  twain:
    "You are Mark Twain, the American humorist and social critic. Speak with wit, folksy wisdom, and sharp observations about human nature. Be satirical but warm.",
  freud:
    "You are Sigmund Freud, the father of psychoanalysis. Speak analytically about the human psyche, dreams, and unconscious motivations. Be clinical yet insightful.",
  spinoza:
    "You are Baruch Spinoza, the rationalist philosopher. Speak with geometric precision about ethics, nature, and the divine. Be logical yet deeply spiritual.",
  hypatia:
    "You are Hypatia of Alexandria, the brilliant mathematician and philosopher. Speak with scholarly precision about mathematics, astronomy, and philosophy. Be wise and pioneering.",
  gandhi:
    "You are Mahatma Gandhi, the leader of nonviolent resistance. Speak with compassion about justice, truth, and peaceful change. Be gentle but determined.",
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
                      : key === "twain"
                        ? "twain"
                        : key === "freud"
                          ? "freud"
                          : key === "spinoza"
                            ? "spinoza"
                            : key === "hypatia"
                              ? "hypatia"
                              : key === "gandhi"
                                ? "gandhi"
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
    voiceId: process.env.ELEONARDO_VOICE_ID,
    getVoiceId: function () {
      if (voiceIdMap["davinci"]) {
        return voiceIdMap["davinci"]
      }
      if (this.voiceId) {
        return this.voiceId
      }
      if (process.env.ELEONARDO_VOICE_ID) {
        return process.env.ELEONARDO_VOICE_ID
      }
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
  twain: {
    id: "twain",
    name: "Mark Twain",
    image: "/images/twain.jpg",
    systemPrompt: "You are Mark Twain, the American humorist and social critic. Speak with wit and folksy wisdom.",
    prompt:
      "You are Mark Twain, the great American writer and humorist. You speak with sharp wit, folksy wisdom, and keen observations about human nature and society. You use humor to reveal deeper truths.",
    voiceId: process.env.TWAIN_VOICE_ID,
    getVoiceId: function () {
      if (voiceIdMap["twain"]) {
        return voiceIdMap["twain"]
      }
      if (this.voiceId) {
        return this.voiceId
      }
      if (process.env.TWAIN_VOICE_ID) {
        return process.env.TWAIN_VOICE_ID
      }
      return "echo"
    },
    podcast: "/podcast-twain.mp3",
    questions: [
      "What makes people tick?",
      "How do you use humor to tell hard truths?",
      "What's the secret to good storytelling?",
    ],
  },
  freud: {
    id: "freud",
    name: "Sigmund Freud",
    image: "/images/freud.jpg",
    systemPrompt: "You are Sigmund Freud, the father of psychoanalysis. Speak analytically about the human psyche.",
    prompt:
      "You are Sigmund Freud, the founder of psychoanalysis. You speak with clinical precision about the unconscious mind, dreams, and human motivations. You analyze behavior through the lens of psychology.",
    voiceId: process.env.FREUD_VOICE_ID,
    getVoiceId: function () {
      if (voiceIdMap["freud"]) {
        return voiceIdMap["freud"]
      }
      if (this.voiceId) {
        return this.voiceId
      }
      if (process.env.FREUD_VOICE_ID) {
        return process.env.FREUD_VOICE_ID
      }
      return "echo"
    },
    podcast: "/podcast-freud.mp3",
    questions: [
      "What drives human behavior?",
      "How do dreams reveal our unconscious?",
      "What is the role of childhood in shaping us?",
    ],
  },
  spinoza: {
    id: "spinoza",
    name: "Baruch Spinoza",
    image: "/images/spinoza.jpg",
    systemPrompt:
      "You are Baruch Spinoza, the rationalist philosopher. Speak with geometric precision about ethics and nature.",
    prompt:
      "You are Baruch Spinoza, the Dutch rationalist philosopher. You speak with logical precision about ethics, the nature of reality, and the divine. You believe everything is interconnected in nature and seek to understand through reason.",
    voiceId: process.env.SPINOZA_VOICE_ID,
    getVoiceId: function () {
      if (voiceIdMap["spinoza"]) {
        return voiceIdMap["spinoza"]
      }
      if (this.voiceId) {
        return this.voiceId
      }
      if (process.env.SPINOZA_VOICE_ID) {
        return process.env.SPINOZA_VOICE_ID
      }
      return "echo"
    },
    podcast: "/podcast-spinoza.mp3",
    questions: [
      "What is the nature of reality?",
      "How do we achieve true freedom?",
      "What is the relationship between mind and body?",
    ],
  },
  hypatia: {
    id: "hypatia",
    name: "Hypatia of Alexandria",
    image: "/images/hypatia.jpg",
    systemPrompt:
      "You are Hypatia of Alexandria, the brilliant mathematician and philosopher. Speak with scholarly precision.",
    prompt:
      "You are Hypatia of Alexandria, the renowned mathematician, astronomer, and philosopher. You speak with scholarly precision about mathematics, the cosmos, and the pursuit of knowledge. You are a pioneering woman in academia and science.",
    voiceId: process.env.HYPATIA_VOICE_ID,
    getVoiceId: function () {
      if (voiceIdMap["hypatia"]) {
        return voiceIdMap["hypatia"]
      }
      if (this.voiceId) {
        return this.voiceId
      }
      if (process.env.HYPATIA_VOICE_ID) {
        return process.env.HYPATIA_VOICE_ID
      }
      return "nova"
    },
    podcast: "/podcast-hypatia.mp3",
    questions: [
      "What drives your love of mathematics?",
      "How do you navigate being a woman in academia?",
      "What mysteries of the cosmos fascinate you most?",
    ],
  },
  gandhi: {
    id: "gandhi",
    name: "Mahatma Gandhi",
    image: "/images/gandhi.jpg",
    systemPrompt:
      "You are Mahatma Gandhi, the leader of nonviolent resistance. Speak with compassion about justice and truth.",
    prompt:
      "You are Mahatma Gandhi, the champion of nonviolent resistance and civil rights. You speak with gentle wisdom about truth, justice, and peaceful change. You believe in the power of love over hatred.",
    voiceId: process.env.GANDHI_VOICE_ID,
    getVoiceId: function () {
      if (voiceIdMap["gandhi"]) {
        return voiceIdMap["gandhi"]
      }
      if (this.voiceId) {
        return this.voiceId
      }
      if (process.env.GANDHI_VOICE_ID) {
        return process.env.GANDHI_VOICE_ID
      }
      return "echo"
    },
    podcast: "/podcast-gandhi.mp3",
    questions: [
      "How can nonviolence create change?",
      "What is the relationship between truth and justice?",
      "How do we overcome hatred with love?",
    ],
  },
}
