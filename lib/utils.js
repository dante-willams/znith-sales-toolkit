'use strict';

/**
 * Extract plain text from an Anthropic /v1/messages response object.
 * Filters to text-type content blocks only; joins with newline.
 */
function extractText(data) {
  return (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();
}

/**
 * Parse JSON that may be wrapped in markdown code fences or embedded in prose.
 * Tries three strategies in order:
 *   1. Direct parse
 *   2. Strip ```json ... ``` fences
 *   3. Extract outermost { } block via brace counting
 * Returns null if all strategies fail.
 */
function safeParseJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]+?)```\s*$/);
  if (fenceMatch) { try { return JSON.parse(fenceMatch[1].trim()); } catch {} }

  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0, end = -1;
    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) { try { return JSON.parse(text.slice(firstBrace, end + 1)); } catch {} }
  }
  return null;
}

/**
 * Compute Win Room health score (0–100) from a MEDDPICC object.
 * Each of the 8 elements contributes: green=2, yellow=1, red=0.
 * Max possible = 16 → normalised to 100.
 */
function computeHealthScore(meddpicc) {
  const scores = { green: 2, yellow: 1, red: 0 };
  const total = Object.values(meddpicc).reduce(
    (sum, v) => sum + (scores[v.status] ?? 0), 0
  );
  return Math.round((total / 16) * 100);
}

/**
 * Valid Win Room MEDDPICC element keys.
 */
const MEDDPICC_KEYS = [
  'metrics', 'economicBuyer', 'decisionCriteria', 'decisionProcess',
  'implicatePain', 'champion', 'competition', 'paperProcess',
];

/**
 * Valid status values for a MEDDPICC element.
 */
const VALID_STATUSES = new Set(['green', 'yellow', 'red']);

module.exports = { extractText, safeParseJSON, computeHealthScore, MEDDPICC_KEYS, VALID_STATUSES };
