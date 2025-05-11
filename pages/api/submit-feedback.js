let feedbackStore = [];

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { text } = req.body;
    feedbackStore.push({ text, timestamp: Date.now() });
    return res.status(200).json({ success: true });
  }
  return res.status(405).end();
}

export const getFeedback = () => feedbackStore;
