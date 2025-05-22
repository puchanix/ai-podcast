// Check if we're running in the browser
const isBrowser = typeof window !== "undefined"

// Initialize debate state from localStorage or defaults
export function initializeDebateState() {
  if (!isBrowser) {
    return {
      character1: "",
      character2: "",
      topic: "",
      messages: [],
      isDebating: false,
      exchangeCount: 0,
    }
  }

  try {
    return {
      character1: localStorage.getItem("debate_character1") || "",
      character2: localStorage.getItem("debate_character2") || "",
      topic: localStorage.getItem("debate_topic") || "",
      messages: JSON.parse(localStorage.getItem("debate_messages") || "[]"),
      isDebating: localStorage.getItem("debate_isDebating") === "true",
      exchangeCount: Number.parseInt(localStorage.getItem("debate_exchangeCount") || "0", 10),
    }
  } catch (error) {
    console.error("Error initializing debate state:", error)
    return {
      character1: "",
      character2: "",
      topic: "",
      messages: [],
      isDebating: false,
      exchangeCount: 0,
    }
  }
}

// Save topic to localStorage
export function saveTopic(topic) {
  if (isBrowser) {
    try {
      localStorage.setItem("debate_topic", topic || "")
    } catch (error) {
      console.error("Error saving topic:", error)
    }
  }
}

// Save messages to localStorage
export function saveMessages(messages) {
  if (isBrowser) {
    try {
      localStorage.setItem("debate_messages", JSON.stringify(messages || []))
    } catch (error) {
      console.error("Error saving messages:", error)
    }
  }
}

// Save isDebating to localStorage
export function saveIsDebating(isDebating) {
  if (isBrowser) {
    try {
      localStorage.setItem("debate_isDebating", isDebating ? "true" : "false")
    } catch (error) {
      console.error("Error saving isDebating:", error)
    }
  }
}

// Save characters to localStorage
export function saveCharacters(character1, character2) {
  if (isBrowser) {
    try {
      localStorage.setItem("debate_character1", character1 || "")
      localStorage.setItem("debate_character2", character2 || "")
    } catch (error) {
      console.error("Error saving characters:", error)
    }
  }
}

// Save exchange count to localStorage
export function saveExchangeCount(count) {
  if (isBrowser) {
    try {
      localStorage.setItem("debate_exchangeCount", count.toString())
    } catch (error) {
      console.error("Error saving exchange count:", error)
    }
  }
}

// Clear all debate state from localStorage
export function clearDebateState() {
  if (isBrowser) {
    try {
      localStorage.removeItem("debate_character1")
      localStorage.removeItem("debate_character2")
      localStorage.removeItem("debate_topic")
      localStorage.removeItem("debate_messages")
      localStorage.removeItem("debate_isDebating")
      localStorage.removeItem("debate_exchangeCount")
      localStorage.removeItem("preparedExchange")
    } catch (error) {
      console.error("Error clearing debate state:", error)
    }
  }
}
