// pages/api/feedback.js

let feedbackStore = [];

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { text } = req.body;
    if (typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Invalid feedback' });
    }
    feedbackStore.push({ text: text.trim(), timestamp: Date.now() });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ feedback: feedbackStore });
  }

  return res.status(405).end(); // Method Not Allowed
}
