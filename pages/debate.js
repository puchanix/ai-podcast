// pages/debate.js
import { useState, useEffect, useRef } from "react"
import { personas } from "../lib/personas"
import styles from "../styles/Debate.module.css"
import Head from "next/head"

export default function DebatePage() {
  const [character1, setCharacter1] = useState(Object.keys(personas)[0])
  const [character2, setCharacter2] = useState(Object.keys(personas)[1])
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [isDebating, setIsDebating] = useState(false)
  const [debateMessages, setDebateMessages] = useState([])
  const [suggestedTopics, setSuggestedTopics] = useState([])
  const [customQuestion, setCustomQuestion] = useState("")
  const [currentTopic, setCurrentTopic] = useState(null)
  const [statusMessage, setStatusMessage] = useState("")
  const messagesEndRef = useRef(null)

  // Get character objects
  const char1 = personas[character1]
  const char2 = personas[character2]

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [debateMessages])

  // Generate debate topics when characters change
  useEffect(() => {
    generateDebateTopics()
  }, [character1, character2])

  // Function to generate debate topics based on selected characters
  const generateDebateTopics = async () => {
    if (character1 === character2) return

    setIsGeneratingTopics(true)
    setStatusMessage("Generating topics...")

    try {
      const response = await fetch("/api/generate-debate-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1,
          character2,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate topics")

      const data = await response.json()
      setSuggestedTopics(data.topics)
      setStatusMessage("")
    } catch (error) {
      console.error("Error generating debate topics:", error)
      setStatusMessage("Failed to generate topics")
      // Fallback topics if API fails
      setSuggestedTopics([
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
      ])
    } finally {
      setIsGeneratingTopics(false)
    }
  }

  // Start a debate on a specific topic
  const startDebate = async (topic) => {
    setCurrentTopic(topic)
    setIsDebating(true)
    setDebateMessages([])
    setStatusMessage("Starting debate...")

    try {
      const response = await fetch("/api/start-debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1,
          character2,
          topic,
        }),
      })

      if (!response.ok) throw new Error("Failed to start debate")

      const data = await response.json()

      // Add initial messages
      setDebateMessages([
        {
          character: character1,
          content: data.opening1,
          timestamp: Date.now(),
        },
        {
          character: character2,
          content: data.opening2,
          timestamp: Date.now() + 100,
        },
      ])
      setStatusMessage("")
    } catch (error) {
      console.error("Error starting debate:", error)
      setStatusMessage("Failed to start debate")
      setIsDebating(false)
    }
  }

  // Submit a custom question to the debate
  const submitCustomQuestion = async () => {
    if (!customQuestion.trim() || !isDebating) return

    const userQuestion = customQuestion.trim()
    setCustomQuestion("")
    setStatusMessage("Processing question...")

    // Add user question as a special message
    setDebateMessages((prev) => [
      ...prev,
      {
        character: "user",
        content: userQuestion,
        timestamp: Date.now(),
      },
    ])

    try {
      const response = await fetch("/api/continue-debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1,
          character2,
          userQuestion,
          currentMessages: debateMessages,
        }),
      })

      if (!response.ok) throw new Error("Failed to continue debate")

      const data = await response.json()

      // Add responses
      setDebateMessages((prev) => [
        ...prev,
        {
          character: character1,
          content: data.response1,
          timestamp: Date.now() + 100,
        },
        {
          character: character2,
          content: data.response2,
          timestamp: Date.now() + 200,
        },
      ])
      setStatusMessage("")
    } catch (error) {
      console.error("Error continuing debate:", error)
      setStatusMessage("Failed to process question")
    }
  }

  return (
    <>
      <Head>
        <title>Historical Debates - AI Podcast</title>
        <meta name="description" content="Watch historical figures debate topics and ask your own questions" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.container}>
        <h1 className={styles.title}>Historical Debates</h1>

        <div className={styles.characterSelection}>
          <div className={styles.characterSelector}>
            <img
              src={char1.image || "/placeholder.svg"}
              alt={char1.name}
              className={styles.characterImage}
            />
            <select
              value={character1}
              onChange={(e) => setCharacter1(e.target.value)}
              className={styles.characterDropdown}
            >
              {Object.entries(personas).map(([id, char]) => (
                <option key={id} value={id}>
                  {char.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.versus}>VS</div>

          <div className={styles.characterSelector}>
            <img
              src={char2.image || "/placeholder.svg"}
              alt={char2.name}
              className={styles.characterImage}
            />
            <select
              value={character2}
              onChange={(e) => setCharacter2(e.target.value)}
              className={styles.characterDropdown}
            >
              {Object.entries(personas).map(([id, char]) => (
                <option key={id} value={id}>
                  {char.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {statusMessage && <div className={styles.statusMessage}>{statusMessage}</div>}

        <div className={styles.topicsSection}>
          <h2>Suggested Debate Topics</h2>
          {isGeneratingTopics ? (
            <div className={styles.loading}>Generating topics...</div>
          ) : (
            <div className={styles.topicsList}>
              {suggestedTopics.map((topic) => (
                <div key={topic.id} className={styles.topicCard} onClick={() => startDebate(topic.title)}>
                  <h3>{topic.title}</h3>
                  <p>{topic.description}</p>
                  <span className={styles.topicCategory}>{topic.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isDebating && (
          <>
            <div className={styles.customQuestionSection}>
              <h2>Ask Your Own Question</h2>
              <div className={styles.questionInput}>
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Enter a debate question or topic..."
                  className={styles.textInput}
                />
                <button 
                  onClick={submitCustomQuestion} 
                  className={styles.submitButton}
                  disabled={!customQuestion.trim()}
                >
                  Submit
                </button>
              </div>
            </div>

            <div className={styles.debateSection}>
              <h2>{currentTopic ? `Debate: ${currentTopic}` : "Select a topic to begin"}</h2>
              <div className={styles.debateContent}>
                {debateMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`${styles.message} ${
                      msg.character === "user"
                        ? styles.userMessage
                        : msg.character === character1
                        ? styles.character1Message
                        : styles.character2Message
                    }`}
                  >
                    {msg.character !== "user" && (
                      <div className={styles.messageHeader}>
                        <img
                          src={personas[msg.character].image || "/placeholder.svg"}
                          alt={personas[msg.character].name}
                          className={styles.messageAvatar}
                        />
                        <span className={styles.messageName}>{personas[msg.character].name}</span>
                      </div>
                    )}
                    <div className={styles.messageContent}>
                      {msg.character === "user" ? (
                        <div className={styles.userQuestion}>
                          <span>You asked:</span> {msg.content}
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </>
        )}

        <div className={styles.footer}>
          <a href="/" className={styles.footerLink}>
            Back to Home
          </a>
        </div>
      </div>
    </>
  )
}