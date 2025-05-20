import { useState } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import { v4 as uuidv4 } from "uuid"

export default function CreateDebatePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [formData, setFormData] = useState({
    topic: "",
    description: "",
    participant1: "",
    participant2: "",
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate inputs
      if (!formData.topic || !formData.description || !formData.participant1 || !formData.participant2) {
        setStatusMessage("All fields are required")
        setIsLoading(false)
        return
      }

      // Create a new debate object
      const newDebate = {
        id: uuidv4(),
        topic: formData.topic,
        description: formData.description,
        participant1: formData.participant1,
        participant2: formData.participant2,
        createdAt: new Date().toISOString(),
        audioUrl: null,
      }

      // Get existing debates from localStorage
      const storedDebates = localStorage.getItem("debates")
      const debates = storedDebates ? JSON.parse(storedDebates) : []

      // Add new debate
      const updatedDebates = [...debates, newDebate]
      localStorage.setItem("debates", JSON.stringify(updatedDebates))

      setStatusMessage("Debate created successfully!")
      
      // Navigate to the debate page
      router.push(`/debate/${newDebate.id}`)
    } catch (error) {
      console.error("Error creating debate:", error)
      setStatusMessage("Failed to create debate. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Head>
        <title>Create Debate</title>
      </Head>

      <button
        onClick={() => router.push("/debate")}
        className="mb-6 bg-button-primary hover:bg-button-hover text-white py-1 px-4 rounded-full"
      >
        ← Back to Debates
      </button>

      <div className="bg-box-accent p-6 rounded-xl shadow-lg border border-border max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create a New Debate</h1>

        {statusMessage && <div className="mb-4 text-amber-500">{statusMessage}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Debate Topic</label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
              placeholder="e.g., Climate Change Solutions"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
              placeholder="Provide context and details about the debate topic..."
              rows="4"
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Participant</label>
              <input
                type="text"
                name="participant1"
                value={formData.participant1}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
                placeholder="e.g., Albert Einstein"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Second Participant</label>
              <input
                type="text"
                name="participant2"
                value={formData.participant2}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
                placeholder="e.g., Nikola Tesla"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-button-primary hover:bg-button-hover disabled:bg-neutral-dark text-white py-2 px-4 rounded-full mt-6"
          >
            {isLoading ? "Creating..." : "Create Debate"}
          </button>
        </form>
      </div>
    </div>
  )
}