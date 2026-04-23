const { test, skip } = require('node:test');
const assert = require('node:assert/strict');

const SMOKE_URL = process.env.SMOKE_URL || 'https://znith-sales-toolkit.vercel.app';
const TOOLKIT_PASSWORD = process.env.TOOLKIT_PASSWORD || '';

function headers() {
  return {
    'Content-Type': 'application/json',
    ...(TOOLKIT_PASSWORD ? { 'x-toolkit-password': TOOLKIT_PASSWORD } : {}),
  };
}

test('smoke: returns 200 with valid content shape', async () => {
  const res = await fetch(`${SMOKE_URL}/api/claude`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
      metadata: { tool: 'smoke-test' },
    }),
  });

  assert.equal(res.status, 200, `Expected 200, got ${res.status}`);

  const data = await res.json();
  assert.ok(Array.isArray(data.content), 'content should be an array');
  assert.ok(data.content.length > 0, 'content should be non-empty');

  const text = data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();
  assert.ok(text.length > 0, 'extracted text should be non-empty');
  assert.ok(data.usage?.input_tokens > 0, 'should have input_tokens');
  assert.ok(data.usage?.output_tokens > 0, 'should have output_tokens');
});

test('smoke: rejects wrong password with 401', async () => {
  if (!TOOLKIT_PASSWORD) return;

  const res = await fetch(`${SMOKE_URL}/api/claude`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-toolkit-password': 'wrong-password',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [{ role: 'user', content: 'hello' }],
    }),
  });

  assert.equal(res.status, 401, `Expected 401, got ${res.status}`);
});

test('smoke: metadata stripped — no tool field forwarded to Anthropic', async () => {
  const res = await fetch(`${SMOKE_URL}/api/claude`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
      metadata: { tool: 'smoke-test', deal_id: 'fixture-001' },
    }),
  });

  // If metadata wasn't stripped, Anthropic would reject with 400
  assert.equal(res.status, 200, 'metadata should be stripped before forwarding');
});
