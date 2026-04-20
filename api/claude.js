module.exports = async function handler(req, res) {
  const TOOLKIT_PASSWORD = process.env.TOOLKIT_PASSWORD;

  if (TOOLKIT_PASSWORD) {
    const supplied = req.headers['x-toolkit-password'] || '';
    if (supplied !== TOOLKIT_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Auth-check ping — just validate the password, don't call Anthropic
  if (req.body && req.body._auth_check) {
    return res.status(200).json({ ok: true });
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
