module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const key = process.env.ANTHROPIC_API_KEY;
    return res.status(200).json({
      keySet: !!key,
      keyPrefix: key ? key.substring(0, 14) + '...' : 'NOT SET',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Proxy error', details: error.message });
  }
}
