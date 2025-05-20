
import { createClient } from 'redis';

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

  if (req.method === 'POST') {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Invalid feedback' });
    }
    const timestamp = Date.now();
    await client.set(`feedback:${timestamp}`, text.trim());
    return res.status(200).json({ success: true });
  }

  if (req.method === 'GET') {
    const keys = await client.keys('feedback:*');
    const sortedKeys = keys.sort((a, b) => b.localeCompare(a)); // newest first
    const values = await Promise.all(sortedKeys.map((k) => client.get(k)));
    const feedback = sortedKeys.map((k, i) => ({
      text: values[i],
      timestamp: Number(k.split(':')[1])
    }));
    return res.status(200).json({ feedback });
  }

  return res.status(405).end(); // Method Not Allowed
}
