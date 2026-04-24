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

  const start = Date.now();
  const { metadata: _meta, ...anthropicBody } = req.body || {};
  const model = anthropicBody.model ?? null;
  const tool = _meta?.tool ?? null;
  const deal_id = _meta?.deal_id ?? null;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31,web-search-2025-03-05',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify(anthropicBody),
    });

    const data = await response.json();

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      type: 'proxy_request',
      deal_id,
      tool,
      model,
      ip,
      input_tokens: data.usage?.input_tokens ?? null,
      output_tokens: data.usage?.output_tokens ?? null,
      cache_creation_input_tokens: data.usage?.cache_creation_input_tokens ?? null,
      cache_read_input_tokens: data.usage?.cache_read_input_tokens ?? null,
      latency_ms: Date.now() - start,
      status: response.status,
      error: null,
    }));

    return res.status(response.status).json(data);

  } catch (error) {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      type: 'proxy_request',
      deal_id,
      tool,
      model,
      input_tokens: null,
      output_tokens: null,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      latency_ms: Date.now() - start,
      status: 500,
      error: error.message,
    }));

    return res.status(500).json({ error: 'Proxy error', details: error.message });
  }
}
