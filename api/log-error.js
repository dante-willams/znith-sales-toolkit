module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tool, message, stack, url, line, col } = req.body || {};

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    type: 'client_error',
    tool: tool ?? null,
    message: message ?? null,
    stack: stack ?? null,
    url: url ?? null,
    line: line ?? null,
    col: col ?? null,
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
  }));

  return res.status(200).json({ ok: true });
}
