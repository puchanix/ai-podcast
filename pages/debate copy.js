// pages/debate.js

// pages/debate.js
import { DebateInterface } from "../components/debate-interface"

export default function DebatePage() {
  return <DebateInterface />
}
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
  const [currentAudio, setCurrentAudio] = useState(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  
  const messagesEndRef = useRef(null)
  const audioRef = useRef(null)
  const audioQueue = useRef([])
  const isProcessingAudio = useRef(false)

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

  // Audio player event handlers
  useEffect(() => {
    if (!audioRef.current) return
    
    const handleEnded = () => {
      setIsPlayingAudio(false)
      playNextInQueue()
    }
    
    const handlePlay = () => setIsPlayingAudio(true)
    const handlePause = () => setIsPlayingAudio(false)
    
    audioRef.current.addEventListener('ended', handleEnded)
    audioRef.current.addEventListener('play', handlePlay)
    audioRef.current.addEventListener('pause', handlePause)
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded)
        audioRef.current.removeEventListener('play', handlePlay)
        audioRef.current.removeEventListener('pause', handlePause)
      }
    }
  }, [])

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
    audioQueue.current = []

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
      
      // Process each exchange and add to messages
      const messages = []
      for (const exchange of data.exchanges) {
        const timestamp = Date.now() + messages.length * 100
        messages.push({
          character: exchange.character,
          content: exchange.content,
          timestamp,
          audioUrl: null,
          isGeneratingAudio: !isMuted
        })
      }
      
      setDebateMessages(messages)
      setStatusMessage("")
      
      // Generate audio for each message if not muted
      if (!isMuted) {
        for (let i = 0; i < messages.length; i++) {
          generateAudioForMessage(i)
        }
      }
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
      
      // Process each exchange and add to messages
      setDebateMessages((prev) => {
        const newMessages = [...prev]
        const startIndex = newMessages.length
        
        for (let i = 0; i < data.exchanges.length; i++) {
          const exchange = data.exchanges[i]
          const timestamp = Date.now() + i * 100
          newMessages.push({
            character: exchange.character,
            content: exchange.content,
            timestamp,
            audioUrl: null,
            isGeneratingAudio: !isMuted
          })
        }
        
        // Generate audio for each new message if not muted
        if (!isMuted) {
          for (let i = 0; i < data.exchanges.length; i++) {
            generateAudioForMessage(startIndex + i)
          }
        }
        
        return newMessages
      })
      
      setStatusMessage("")
    } catch (error) {
      console.error("Error continuing debate:", error)
      setStatusMessage("Failed to process question")
    }
  }

  // Generate audio for a specific message
  const generateAudioForMessage = async (messageIndex) => {
    // Update message to show it's generating audio
    setDebateMessages(prev => {
      const updated = [...prev]
      if (updated[messageIndex]) {
        updated[messageIndex] = {
          ...updated[messageIndex],
          isGeneratingAudio: true
        }
      }
      return updated
    })
    
    const message = debateMessages[messageIndex]
    if (!message || message.character === "user") return
    
    try {
      const response = await fetch("/api/generate-debate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character: message.character,
          text: message.content,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate audio")

      const data = await response.json()
      
      // Update message with audio URL
      setDebateMessages(prev => {
        const updated = [...prev]
        if (updated[messageIndex]) {
          updated[messageIndex] = {
            ...updated[messageIndex],
            audioUrl: data.audioUrl,
            isGeneratingAudio: false
          }
        }
        return updated
      })
      
      // Add to audio queue
      audioQueue.current.push({
        url: data.audioUrl,
        messageIndex
      })
      
      // Play if nothing is currently playing
      if (!isPlayingAudio && !isProcessingAudio.current) {
        playNextInQueue()
      }
    } catch (error) {
      console.error("Error generating audio:", error)
      
      // Update message to show audio generation failed
      setDebateMessages(prev => {
        const updated = [...prev]
        if (updated[messageIndex]) {
          updated[messageIndex] = {
            ...updated[messageIndex],
            isGeneratingAudio: false
          }
        }
        return updated
      })
    }
  }

  // Play the next audio in the queue
  const playNextInQueue = () => {
    if (isMuted || audioQueue.current.length === 0 || isProcessingAudio.current) return
    
    isProcessingAudio.current = true
    const nextAudio = audioQueue.current.shift()
    setCurrentAudio(nextAudio)
    
    if (audioRef.current) {
      audioRef.current.src = nextAudio.url
      audioRef.current.load()
      audioRef.current.play()
        .then(() => {
          isProcessingAudio.current = false
        })
        .catch(err => {
          console.error("Error playing audio:", err)
          isProcessingAudio.current = false
          playNextInQueue() // Try the next one
        })
    }
  }

  // Toggle mute state
  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (audioRef.current) {
      audioRef.current.pause()
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

        {/* Audio controls */}
        <div className={styles.audioControls}>
          <button 
            onClick={toggleMute} 
            className={`${styles.audioButton} ${isMuted ? styles.muted : ''}`}
          >
            {isMuted ? "🔇 Unmute" : "🔊 Mute"}
          </button>
          <audio ref={audioRef} hidden />
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
                    } ${currentAudio?.messageIndex === idx ? styles.activeSpeaking : ''}`}
                  >
                    {msg.character !== "user" && (
                      <div className={styles.messageHeader}>
                        <img
                          src={personas[msg.character].image || "/placeholder.svg"}
                          alt={personas[msg.character].name}
                          className={styles.messageAvatar}
                        />
                        <span className={styles.messageName}>{personas[msg.character].name}</span>
                        {msg.isGeneratingAudio && (
                          <span className={styles.generatingAudio}>Generating audio...</span>
                        )}
                        {msg.audioUrl && !msg.isGeneratingAudio && (
                          <button 
                            className={styles.playButton}
                            onClick={() => {
                              if (audioRef.current) {
                                audioRef.current.src = msg.audioUrl;
                                audioRef.current.play();
                                setCurrentAudio({ url: msg.audioUrl, messageIndex: idx });
                              }
                            }}
                          >
                            🔊
                          </button>
                        )}
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