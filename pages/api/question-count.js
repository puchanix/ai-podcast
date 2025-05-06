// pages/api/question-count.js
import { createClient } from 'redis';

// Reuse a single Redis client across invocations
const redisClient = createClient({ url: process.env.REDIS_URL });
let isRedisConnected = false;
async function getRedis() {
  if (!isRedisConnected) {
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
    isRedisConnected = true;
  }
  return redisClient;
}

export default async function handler(req, res) {
  const client = await getRedis();

  // Determine character and question from query (for GET/DELETE) or body (for POST)
  let character;
  let question;
  if (req.method === 'GET' || req.method === 'DELETE') {
    character = req.query.character || 'daVinci';
    question  = req.query.question;
  } else if (req.method === 'POST') {
    ({ character, question } = req.body);
    character = character || 'daVinci';
  } else {
    res.setHeader('Allow', ['GET','POST','DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (req.method === 'GET') {
    // List popular questions for a character
    const charCounts = await client.hGetAll(`questions:${character}`) || {};
    const questions = Object.entries(charCounts)
      .map(([q, count]) => ({ question: q, count: Number(count) }))
      .sort((a, b) => b.count - a.count);
    return res.status(200).json({ questions });

  } else if (req.method === 'POST') {
    // Increment count for a question
    if (!question) {
      return res.status(400).json({ error: 'Missing question' });
    }
    await client.hIncrBy(`questions:${character}`, question, 1);
    return res.status(200).json({ success: true });

  } else if (req.method === 'DELETE') {
    // Deletion logic
    if (question) {
      // Delete specific question
      await client.hDel(`questions:${character}`, question);
    } else if (req.query.character) {
      // Reset this character
      await client.del(`questions:${character}`);
    } else {
      // Reset all characters
      const keys = await client.keys('questions:*');
      for (const key of keys) {
        await client.del(key);
      }
    }
    return res.status(200).json({ success: true });
  }
}

