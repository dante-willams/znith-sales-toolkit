'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq({ body = {}, password = 'secret', method = 'POST' } = {}) {
  return { method, body, headers: { 'x-toolkit-password': password } };
}

function makeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
}

const MOCK_ANTHROPIC_RESPONSE = {
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-4-6',
  content: [{ type: 'text', text: 'ok' }],
  usage: {
    input_tokens: 100,
    output_tokens: 50,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 80,
  },
};

// ─── Test setup ───────────────────────────────────────────────────────────────

let originalFetch;
let capturedFetchArgs;

beforeEach(() => {
  originalFetch = global.fetch;
  capturedFetchArgs = null;

  // Default mock: returns a successful Anthropic response
  global.fetch = async (url, options) => {
    capturedFetchArgs = { url, options };
    return {
      status: 200,
      json: async () => ({ ...MOCK_ANTHROPIC_RESPONSE }),
    };
  };

  process.env.ANTHROPIC_API_KEY = 'test-api-key';
  process.env.TOOLKIT_PASSWORD = 'secret';
});

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.TOOLKIT_PASSWORD;
});

// Re-require handler fresh each test to pick up env changes
function getHandler() {
  // Clear require cache so env vars are re-read
  const path = require('path');
  const handlerPath = path.resolve(__dirname, '../api/claude.js');
  delete require.cache[handlerPath];
  return require(handlerPath);
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe('proxy auth', () => {
  test('returns 401 when wrong password supplied', async () => {
    const handler = getHandler();
    const req = makeReq({ password: 'wrong' });
    const res = makeRes();
    await handler(req, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });

  test('returns 401 when no password header supplied', async () => {
    const handler = getHandler();
    const req = makeReq({ password: '' });
    const res = makeRes();
    await handler(req, res);
    assert.equal(res.statusCode, 401);
  });

  test('allows request when correct password supplied', async () => {
    const handler = getHandler();
    const req = makeReq({ body: { model: 'claude-sonnet-4-6', messages: [] } });
    const res = makeRes();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
  });

  test('skips auth when TOOLKIT_PASSWORD env var is not set', async () => {
    delete process.env.TOOLKIT_PASSWORD;
    const handler = getHandler();
    const req = makeReq({ password: '' });
    const req2 = { ...req, body: { model: 'claude-sonnet-4-6', messages: [] } };
    const res = makeRes();
    await handler(req2, res);
    assert.equal(res.statusCode, 200);
  });
});

// ─── Auth-check ping ──────────────────────────────────────────────────────────

describe('proxy auth-check ping', () => {
  test('returns 200 ok without calling Anthropic', async () => {
    const handler = getHandler();
    const req = makeReq({ body: { _auth_check: true } });
    const res = makeRes();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(capturedFetchArgs, null, 'should not have called Anthropic');
  });
});

// ─── Method guard ─────────────────────────────────────────────────────────────

describe('proxy method guard', () => {
  test('returns 405 for GET requests', async () => {
    const handler = getHandler();
    const req = makeReq({ method: 'GET' });
    const res = makeRes();
    await handler(req, res);
    assert.equal(res.statusCode, 405);
  });

  test('returns 405 for DELETE requests', async () => {
    const handler = getHandler();
    const req = makeReq({ method: 'DELETE' });
    const res = makeRes();
    await handler(req, res);
    assert.equal(res.statusCode, 405);
  });
});

// ─── Anthropic forwarding ─────────────────────────────────────────────────────

describe('proxy Anthropic forwarding', () => {
  test('calls correct Anthropic endpoint', async () => {
    const handler = getHandler();
    const req = makeReq({ body: { model: 'claude-sonnet-4-6', messages: [] } });
    await handler(req, makeRes());
    assert.equal(capturedFetchArgs.url, 'https://api.anthropic.com/v1/messages');
  });

  test('sends x-api-key header', async () => {
    const handler = getHandler();
    const req = makeReq({ body: { model: 'claude-sonnet-4-6', messages: [] } });
    await handler(req, makeRes());
    assert.equal(capturedFetchArgs.options.headers['x-api-key'], 'test-api-key');
  });

  test('sends anthropic-version header', async () => {
    const handler = getHandler();
    const req = makeReq({ body: { model: 'claude-sonnet-4-6', messages: [] } });
    await handler(req, makeRes());
    assert.ok(capturedFetchArgs.options.headers['anthropic-version']);
  });

  test('enables prompt caching beta header', async () => {
    const handler = getHandler();
    const req = makeReq({ body: { model: 'claude-sonnet-4-6', messages: [] } });
    await handler(req, makeRes());
    assert.ok(
      capturedFetchArgs.options.headers['anthropic-beta'].includes('prompt-caching'),
      'prompt-caching beta header should be set'
    );
  });

  test('does not forward x-toolkit-password to Anthropic', async () => {
    const handler = getHandler();
    const req = makeReq({ body: { model: 'claude-sonnet-4-6', messages: [] } });
    await handler(req, makeRes());
    assert.ok(
      !capturedFetchArgs.options.headers['x-toolkit-password'],
      'should not leak toolkit password to Anthropic'
    );
  });

  test('proxies Anthropic status code back to client', async () => {
    global.fetch = async () => ({
      status: 429,
      json: async () => ({ error: { type: 'rate_limit_error', message: 'Too many requests' } }),
    });
    const handler = getHandler();
    const req = makeReq({ body: { model: 'claude-sonnet-4-6', messages: [] } });
    const res = makeRes();
    await handler(req, res);
    assert.equal(res.statusCode, 429);
  });
});

// ─── Response shape ───────────────────────────────────────────────────────────

describe('proxy response shape', () => {
  test('response has id field', async () => {
    const handler = getHandler();
    const req = makeReq({ body: { model: 'claude-sonnet-4-6', messages: [] } });
    const res = makeRes();
    await handler(req, res);
    assert.ok('id' in res.body);
  });

  test('response has content array', async () => {
    const handler = getHandler();
    const req = makeReq({ body: { model: 'claude-sonnet-4-6', messages: [] } });
    const res = makeRes();
    await handler(req, res);
    assert.ok(Array.isArray(res.body.content));
  });

  test('response has usage object with token counts', async () => {
    const handler = getHandler();
    const req = makeReq({ body: { model: 'claude-sonnet-4-6', messages: [] } });
    const res = makeRes();
    await handler(req, res);
    const { usage } = res.body;
    assert.ok(typeof usage === 'object', 'usage should be an object');
    assert.ok(typeof usage.input_tokens === 'number');
    assert.ok(typeof usage.output_tokens === 'number');
  });

  test('returns 500 with error shape when fetch throws', async () => {
    global.fetch = async () => { throw new Error('network failure'); };
    const handler = getHandler();
    const req = makeReq({ body: { model: 'claude-sonnet-4-6', messages: [] } });
    const res = makeRes();
    await handler(req, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error, 'Proxy error');
    assert.ok(typeof res.body.details === 'string');
  });
});
