import { useState } from "react";

export default function Feedback() {
  const [submitted, setSubmitted] = useState(false);
  const [text, setText] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); // 🛑 Prevent default form submission
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (res.ok) {
      setSubmitted(true);
      setText("");
    } else {
      alert("Failed to submit feedback.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-copy p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <label className="block text-lg font-semibold">
          Please share your feedback and suggestions.
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-2 rounded bg-box-accent text-black"
          rows={5}
          required
        />
        <button
          type="submit"
          className="bg-button-primary hover:bg-button-hover text-white py-2 px-4 rounded"
        >
          Submit
        </button>
        {submitted && <p className="text-green-400 mt-2">Thank you for your feedback!</p>}
      </form>
    </div>
  );
}

