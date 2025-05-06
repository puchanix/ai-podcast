// pages/api/question-count.js
import { createClient } from 'redis';

// Reuse single Redis client
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
  const { character, question } = req.method === 'GET' ? req.query : req.body;

  if (req.method === 'GET') {
    // List popular questions for a character
    const char = character || 'daVinci';
    const charCounts = await client.hGetAll(`questions:${char}`) || {};
    const questions = Object.entries(charCounts)
      .map(([q, count]) => ({ question: q, count: Number(count) }))
      .sort((a, b) => b.count - a.count);
    return res.status(200).json({ questions });

  } else if (req.method === 'POST') {
    // Increment count for a question
    if (!character || !question) {
      return res.status(400).json({ error: 'Missing character or question' });
    }
    await client.hIncrBy(`questions:${character}`, question, 1);
    return res.status(200).json({ success: true });

  } else if (req.method === 'DELETE') {
    // DELETE logic:
    // - If question provided: delete specific question
    // - Else if character provided: reset that character
    // - Else: reset all characters
    if (question) {
      await client.hDel(`questions:${character}`, question);
    } else if (character) {
      await client.del(`questions:${character}`);
    } else {
      const keys = await client.keys('questions:*');
      for (const key of keys) {
        await client.del(key);
      }
    }
    return res.status(200).json({ success: true });

  } else {
    res.setHeader('Allow', ['GET','POST','DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}