'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractText,
  safeParseJSON,
  computeHealthScore,
  MEDDPICC_KEYS,
  VALID_STATUSES,
} = require('../lib/utils.js');

// ─── extractText ──────────────────────────────────────────────────────────────

describe('extractText', () => {
  test('returns text from a single text block', () => {
    const data = { content: [{ type: 'text', text: 'hello world' }] };
    assert.equal(extractText(data), 'hello world');
  });

  test('joins multiple text blocks with newline', () => {
    const data = {
      content: [
        { type: 'text', text: 'first' },
        { type: 'text', text: 'second' },
      ],
    };
    assert.equal(extractText(data), 'first\nsecond');
  });

  test('filters out non-text blocks', () => {
    const data = {
      content: [
        { type: 'tool_use', id: 'x', name: 'web_search', input: {} },
        { type: 'text', text: 'answer' },
      ],
    };
    assert.equal(extractText(data), 'answer');
  });

  test('returns empty string for empty content array', () => {
    assert.equal(extractText({ content: [] }), '');
  });

  test('returns empty string when content key is missing', () => {
    assert.equal(extractText({}), '');
  });

  test('trims leading/trailing whitespace', () => {
    const data = { content: [{ type: 'text', text: '  trimmed  ' }] };
    assert.equal(extractText(data), 'trimmed');
  });
});

// ─── safeParseJSON ────────────────────────────────────────────────────────────

describe('safeParseJSON', () => {
  test('parses clean JSON directly', () => {
    assert.deepEqual(safeParseJSON('{"a":1}'), { a: 1 });
  });

  test('parses JSON wrapped in ```json fences', () => {
    const input = '```json\n{"score":42}\n```';
    assert.deepEqual(safeParseJSON(input), { score: 42 });
  });

  test('parses JSON wrapped in plain ``` fences', () => {
    const input = '```\n{"score":42}\n```';
    assert.deepEqual(safeParseJSON(input), { score: 42 });
  });

  test('extracts JSON from surrounding prose', () => {
    const input = 'Here is the result: {"status":"green","evidence":"strong"} — done.';
    assert.deepEqual(safeParseJSON(input), { status: 'green', evidence: 'strong' });
  });

  test('returns null for empty string', () => {
    assert.equal(safeParseJSON(''), null);
  });

  test('returns null for null input', () => {
    assert.equal(safeParseJSON(null), null);
  });

  test('returns null for unparseable text', () => {
    assert.equal(safeParseJSON('this is not json at all'), null);
  });

  test('handles nested objects correctly', () => {
    const obj = { outer: { inner: [1, 2, 3] } };
    assert.deepEqual(safeParseJSON(JSON.stringify(obj)), obj);
  });

  test('is idempotent — parsing already-clean JSON twice gives same result', () => {
    const input = '{"x":1}';
    assert.deepEqual(safeParseJSON(input), safeParseJSON(JSON.stringify(safeParseJSON(input))));
  });
});

// ─── computeHealthScore ───────────────────────────────────────────────────────

function makeMeddpicc(status) {
  return Object.fromEntries(MEDDPICC_KEYS.map(k => [k, { status, evidence: '' }]));
}

describe('computeHealthScore', () => {
  test('all green returns 100', () => {
    assert.equal(computeHealthScore(makeMeddpicc('green')), 100);
  });

  test('all red returns 0', () => {
    assert.equal(computeHealthScore(makeMeddpicc('red')), 0);
  });

  test('all yellow returns 50', () => {
    assert.equal(computeHealthScore(makeMeddpicc('yellow')), 50);
  });

  test('score is always between 0 and 100', () => {
    // test every combination of two statuses across all 8 keys
    const statuses = ['green', 'yellow', 'red'];
    for (const s of statuses) {
      const score = computeHealthScore(makeMeddpicc(s));
      assert.ok(score >= 0 && score <= 100, `score ${score} out of range for status "${s}"`);
    }
  });

  test('exactly 8 MEDDPICC keys are defined', () => {
    assert.equal(MEDDPICC_KEYS.length, 8);
  });

  test('VALID_STATUSES contains exactly green, yellow, red', () => {
    assert.deepEqual(new Set(VALID_STATUSES), new Set(['green', 'yellow', 'red']));
  });

  test('mixed scores produce expected value', () => {
    // 4 green (4×2=8) + 4 red (4×0=0) = 8/16 = 50
    const meddpicc = Object.fromEntries(
      MEDDPICC_KEYS.map((k, i) => [k, { status: i < 4 ? 'green' : 'red', evidence: '' }])
    );
    assert.equal(computeHealthScore(meddpicc), 50);
  });

  test('score increases monotonically as statuses improve', () => {
    const allRed = computeHealthScore(makeMeddpicc('red'));
    const allYellow = computeHealthScore(makeMeddpicc('yellow'));
    const allGreen = computeHealthScore(makeMeddpicc('green'));
    assert.ok(allRed < allYellow);
    assert.ok(allYellow < allGreen);
  });
});
