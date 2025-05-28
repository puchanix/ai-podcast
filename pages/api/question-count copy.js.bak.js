// pages/api/question-count.js
import { createClient } from 'redis';

// Reuse a single Redis client across lambda invocations
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

  if (req.method === 'GET') {
    const { character = 'daVinci' } = req.query;
    // Fetch all counts for this character
    const charCounts = await client.hGetAll(`questions:${character}`) || {};
    const questions = Object.entries(charCounts)
      .map(([question, count]) => ({ question, count: Number(count) }))
      .sort((a, b) => b.count - a.count);
    return res.status(200).json({ questions });

  } else if (req.method === 'POST') {
    try {
      const { character = 'daVinci', question } = req.body;
      if (!question) {
        return res.status(400).json({ error: 'Missing question' });
      }
      // Increment the question count in Redis
      await client.hIncrBy(`questions:${character}`, question, 1);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Question-count handler error:', err);
      return res.status(500).json({ error: err.message });
    }

  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
