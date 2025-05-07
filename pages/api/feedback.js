
import fs from 'fs';
import path from 'path';

const feedbackFile = path.resolve('./data', 'feedback.json');

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { text } = req.body;
    if (typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Invalid feedback' });
    }

    let existing = [];
    if (fs.existsSync(feedbackFile)) {
      const content = fs.readFileSync(feedbackFile, 'utf8');
      existing = JSON.parse(content);
    }

    existing.push({ text: text.trim(), timestamp: Date.now() });
    fs.writeFileSync(feedbackFile, JSON.stringify(existing, null, 2));
    return res.status(200).json({ success: true });
  }

  if (req.method === 'GET') {
    if (!fs.existsSync(feedbackFile)) {
      return res.status(200).json({ feedback: [] });
    }
    const content = fs.readFileSync(feedbackFile, 'utf8');
    const feedback = JSON.parse(content);
    return res.status(200).json({ feedback });
  }

  return res.status(405).end();
}
