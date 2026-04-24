const { test } = require('node:test');
const assert = require('node:assert/strict');

const SMOKE_URL = process.env.SMOKE_URL || 'https://znith-sales-toolkit.vercel.app';
const TOOLKIT_PASSWORD = process.env.TOOLKIT_PASSWORD || '';

function headers() {
  return {
    'Content-Type': 'application/json',
    ...(TOOLKIT_PASSWORD ? { 'x-toolkit-password': TOOLKIT_PASSWORD } : {}),
  };
}

async function callProxy(body) {
  const res = await fetch(`${SMOKE_URL}/api/claude`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  return res;
}

function extractText(data) {
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
}

// ── Basic shape ────────────────────────────────────────────────────────────────

test('smoke: returns 200 with valid content shape', async () => {
  const res = await callProxy({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 32,
    messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
    metadata: { tool: 'smoke-test' },
  });

  assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
  const data = await res.json();
  assert.ok(Array.isArray(data.content), 'content should be an array');
  assert.ok(data.content.length > 0, 'content should be non-empty');
  assert.ok(extractText(data).length > 0, 'extracted text should be non-empty');
  assert.ok(data.usage?.input_tokens > 0, 'should have input_tokens');
  assert.ok(data.usage?.output_tokens > 0, 'should have output_tokens');
});

test('smoke: rejects wrong password with 401', async () => {
  if (!TOOLKIT_PASSWORD) return;

  const res = await fetch(`${SMOKE_URL}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-toolkit-password': 'wrong-password' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 32, messages: [{ role: 'user', content: 'hello' }] }),
  });
  assert.equal(res.status, 401, `Expected 401, got ${res.status}`);
});

test('smoke: metadata stripped — Anthropic accepts request without rejecting', async () => {
  const res = await callProxy({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 32,
    messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
    metadata: { tool: 'smoke-test', deal_id: 'fixture-001' },
  });
  assert.equal(res.status, 200, 'metadata should be stripped before forwarding');
});

// ── JSON synthesis (catches "Synthesis failed" class of errors) ───────────────

test('smoke: JSON synthesis — response is valid parseable JSON', async () => {
  const res = await callProxy({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 128,
    messages: [{
      role: 'user',
      content: 'Return ONLY valid JSON: {"status":"ok","score":100}. No preamble, no markdown.'
    }],
    metadata: { tool: 'smoke-test' },
  });

  assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
  const data = await res.json();
  const text = extractText(data);
  assert.ok(text.length > 0, 'response text should not be empty');

  let parsed;
  try {
    // Strip markdown fences if present
    const clean = text.replace(/```(?:json)?\s*([\s\S]+?)```/g, '$1').trim();
    parsed = JSON.parse(clean);
  } catch {
    assert.fail(`Response is not valid JSON — "Synthesis failed" class error. Got: ${text.slice(0, 200)}`);
  }
  assert.ok(parsed && typeof parsed === 'object', 'parsed response should be an object');
});

// ── API key health ─────────────────────────────────────────────────────────────

test('smoke: Anthropic API key is valid and not rate-limited', async () => {
  const res = await callProxy({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Say: ok' }],
    metadata: { tool: 'smoke-test' },
  });

  const data = await res.json();

  if (res.status === 401) assert.fail('Anthropic API key is invalid or missing');
  if (res.status === 429) assert.fail('Anthropic API key is rate-limited');
  if (res.status === 529) assert.fail('Anthropic API is overloaded');
  if (data.error) assert.fail(`Anthropic error: ${data.error.message || JSON.stringify(data.error)}`);

  assert.equal(res.status, 200, `Unexpected status: ${res.status}`);
});

// ── Page loads ────────────────────────────────────────────────────────────────

function pageHeaders() {
  return TOOLKIT_PASSWORD ? { 'x-toolkit-password': TOOLKIT_PASSWORD } : {};
}

const PAGES = [
  { path: '/account-brief-v2/', label: 'account-brief-v2', contains: 'Account Brief' },
  { path: '/value-map/',        label: 'value-map',        contains: 'Value Map' },
  { path: '/qualify-iq/',       label: 'qualify-iq',       contains: 'Qualify' },
  { path: '/demo-brief/',       label: 'demo-brief',       contains: 'Demo' },
  { path: '/win-room/',         label: 'win-room',         contains: 'Win Room' },
  { path: '/prospecting-agent/', label: 'prospecting-agent', contains: 'Prospecting' },
];

for (const { path, label, contains } of PAGES) {
  test(`smoke: ${label} page loads 200 with expected content`, async () => {
    const res = await fetch(`${SMOKE_URL}${path}`, { headers: pageHeaders() });
    assert.equal(res.status, 200, `${label}: expected 200, got ${res.status}`);
    const html = await res.text();
    assert.ok(html.includes(contains), `${label}: page should contain "${contains}"`);
  });
}

test('smoke: pages reject wrong password with 401', async () => {
  if (!TOOLKIT_PASSWORD) return; // skip when auth is not configured
  const res = await fetch(`${SMOKE_URL}/account-brief-v2/`, {
    headers: { 'x-toolkit-password': 'wrong-password-smoke-test' },
  });
  assert.equal(res.status, 401, `Expected 401 for wrong password, got ${res.status}`);
});

// ── Latency ────────────────────────────────────────────────────────────────────

test('smoke: response latency under 15s', async () => {
  const start = Date.now();
  const res = await callProxy({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 32,
    messages: [{ role: 'user', content: 'Say: ok' }],
    metadata: { tool: 'smoke-test' },
  });
  const latency = Date.now() - start;

  assert.equal(res.status, 200);
  assert.ok(latency < 15000, `Response took ${latency}ms — exceeds 15s threshold`);
});
