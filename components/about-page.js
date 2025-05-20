"use client"

export default function AboutPage() {
  const styles = {
    aboutContainer: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "2rem 1rem",
    },
    aboutTitle: {
      fontSize: "2.5rem",
      textAlign: "center",
      marginBottom: "2rem",
    },
    aboutSection: {
      marginBottom: "3rem",
    },
    featureGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
      gap: "1.5rem",
      marginTop: "1.5rem",
    },
    featureCard: {
      backgroundColor: "#f9f9f9",
      borderRadius: "8px",
      padding: "1.5rem",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    featureIcon: {
      fontSize: "2rem",
      marginBottom: "1rem",
    },
    techList: {
      listStyleType: "disc",
      paddingLeft: "1.5rem",
      marginTop: "1rem",
    },
    contactButton: {
      display: "inline-block",
      backgroundColor: "#0070f3",
      color: "white",
      padding: "0.75rem 1.5rem",
      borderRadius: "4px",
      textDecoration: "none",
      fontWeight: "500",
      marginTop: "1rem",
    },
  }

  return (
    <div style={styles.aboutContainer}>
      <h1 style={styles.aboutTitle}>About AI Podcast</h1>

      <section style={styles.aboutSection}>
        <h2>What is AI Podcast?</h2>
        <p>
          AI Podcast is an interactive experience that lets you have voice conversations with historical figures through
          the power of artificial intelligence. Ask questions, hear responses in their voices, and learn from some of
          the greatest minds in history.
        </p>
      </section>

      <section style={styles.aboutSection}>
        <h2>How It Works</h2>
        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🎙️</div>
            <h3>Voice Interaction</h3>
            <p>Ask questions using your voice or select from suggested questions</p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🧠</div>
            <h3>AI Processing</h3>
            <p>Advanced AI models understand your questions and generate authentic responses</p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🔊</div>
            <h3>Voice Synthesis</h3>
            <p>Hear responses in voices that match the historical figures' characteristics</p>
          </div>
        </div>
      </section>

      <section style={styles.aboutSection}>
        <h2>Technology</h2>
        <p>AI Podcast uses cutting-edge AI technologies including:</p>
        <ul style={styles.techList}>
          <li>OpenAI's GPT-4 for natural language understanding and response generation</li>
          <li>Whisper API for accurate speech-to-text conversion</li>
          <li>ElevenLabs for realistic voice synthesis</li>
          <li>Next.js for a responsive and interactive web experience</li>
        </ul>
      </section>

      <section style={styles.aboutSection}>
        <h2>Privacy</h2>
        <p>
          We value your privacy. Voice recordings are processed securely and are not stored beyond what's necessary to
          generate responses. No personal information is collected during your conversations.
        </p>
      </section>

      <section style={styles.aboutSection}>
        <h2>Contact</h2>
        <p>Have questions, suggestions, or feedback? We'd love to hear from you!</p>
        <a
          href="mailto:contact@example.com"
          style={styles.contactButton}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#0051a2")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#0070f3")}
        >
          Contact Us
        </a>
      </section>
    </div>
  )
}
