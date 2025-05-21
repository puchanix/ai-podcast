// lib/debate-state.js
// A centralized state management module for debate state

// Keys for localStorage
const STORAGE_KEYS = {
    TOPIC: "debate_topic",
    MESSAGES: "debate_messages",
    IS_DEBATING: "debate_is_debating",
    CHARACTER1: "debate_character1",
    CHARACTER2: "debate_character2",
    EXCHANGE_COUNT: "debate_exchange_count",
  }
  
  // Initialize state from localStorage or defaults
  export function initializeDebateState() {
    try {
      return {
        topic: localStorage.getItem(STORAGE_KEYS.TOPIC) || "",
        messages: JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || "[]"),
        isDebating: localStorage.getItem(STORAGE_KEYS.IS_DEBATING) === "true",
        character1: localStorage.getItem(STORAGE_KEYS.CHARACTER1) || "",
        character2: localStorage.getItem(STORAGE_KEYS.CHARACTER2) || "",
        exchangeCount: Number.parseInt(localStorage.getItem(STORAGE_KEYS.EXCHANGE_COUNT) || "0", 10),
      }
    } catch (error) {
      console.error("Error initializing debate state:", error)
      return {
        topic: "",
        messages: [],
        isDebating: false,
        character1: "",
        character2: "",
        exchangeCount: 0,
      }
    }
  }
  
  // Save topic to localStorage
  export function saveTopic(topic) {
    try {
      localStorage.setItem(STORAGE_KEYS.TOPIC, topic)
    } catch (error) {
      console.error("Error saving topic:", error)
    }
  }
  
  // Save messages to localStorage
  export function saveMessages(messages) {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages))
    } catch (error) {
      console.error("Error saving messages:", error)
    }
  }
  
  // Save isDebating state to localStorage
  export function saveIsDebating(isDebating) {
    try {
      localStorage.setItem(STORAGE_KEYS.IS_DEBATING, isDebating.toString())
    } catch (error) {
      console.error("Error saving isDebating state:", error)
    }
  }
  
  // Save characters to localStorage
  export function saveCharacters(character1, character2) {
    try {
      localStorage.setItem(STORAGE_KEYS.CHARACTER1, character1)
      localStorage.setItem(STORAGE_KEYS.CHARACTER2, character2)
    } catch (error) {
      console.error("Error saving characters:", error)
    }
  }
  
  // Save exchange count to localStorage
  export function saveExchangeCount(count) {
    try {
      localStorage.setItem(STORAGE_KEYS.EXCHANGE_COUNT, count.toString())
    } catch (error) {
      console.error("Error saving exchange count:", error)
    }
  }
  
  // Clear all debate state from localStorage
  export function clearDebateState() {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
    } catch (error) {
      console.error("Error clearing debate state:", error)
    }
  }
  
  // Save all debate state at once
  export function saveDebateState(state) {
    try {
      saveTopic(state.topic)
      saveMessages(state.messages)
      saveIsDebating(state.isDebating)
      saveCharacters(state.character1, state.character2)
      saveExchangeCount(state.exchangeCount)
    } catch (error) {
      console.error("Error saving debate state:", error)
    }
  }
  