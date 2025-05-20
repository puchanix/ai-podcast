import styles from "../styles/About.module.css"

export default function AboutPage() {
  return (
    <div className={styles.aboutContainer}>
      <h1 className={styles.aboutTitle}>About AI Podcast</h1>

      <section className={styles.aboutSection}>
        <h2>What is AI Podcast?</h2>
        <p>
          AI Podcast is an interactive experience that lets you have voice conversations with historical figures through
          the power of artificial intelligence. Ask questions, hear responses in their voices, and learn from some of
          the greatest minds in history.
        </p>
      </section>

      <section className={styles.aboutSection}>
        <h2>How It Works</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🎙️</div>
            <h3>Voice Interaction</h3>
            <p>Ask questions using your voice or select from suggested questions</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🧠</div>
            <h3>AI Processing</h3>
            <p>Advanced AI models understand your questions and generate authentic responses</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔊</div>
            <h3>Voice Synthesis</h3>
            <p>Hear responses in voices that match the historical figures' characteristics</p>
          </div>
        </div>
      </section>

      <section className={styles.aboutSection}>
        <h2>Technology</h2>
        <p>AI Podcast uses cutting-edge AI technologies including:</p>
        <ul className={styles.techList}>
          <li>OpenAI's GPT-4 for natural language understanding and response generation</li>
          <li>Whisper API for accurate speech-to-text conversion</li>
          <li>ElevenLabs for realistic voice synthesis</li>
          <li>Next.js for a responsive and interactive web experience</li>
        </ul>
      </section>

      <section className={styles.aboutSection}>
        <h2>Privacy</h2>
        <p>
          We value your privacy. Voice recordings are processed securely and are not stored beyond what's necessary to
          generate responses. No personal information is collected during your conversations.
        </p>
      </section>

      <section className={styles.aboutSection}>
        <h2>Contact</h2>
        <p>Have questions, suggestions, or feedback? We'd love to hear from you!</p>
        <a href="mailto:contact@example.com" className={styles.contactButton}>
          Contact Us
        </a>
      </section>
    </div>
  )
}
