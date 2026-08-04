/* ═══════════════════════════════════════════════════════════════
   /api/invoke-llm — Vercel serverless function
   ───────────────────────────────────────────────────────────────
   This is the Antigravity build's equivalent of Base44's server-side
   InvokeLLM. It exists so the API key lives in a Vercel environment
   variable and NEVER reaches the browser.

   Required env var (Vercel → Project → Settings → Environment Variables):
       ANTHROPIC_API_KEY = sk-ant-...

   Contract (mirrors the plan's InvokeLLM shape):
       POST { prompt: string, response_json_schema: object }
       200  -> the parsed object matching response_json_schema
       4xx  -> { error: "..." }

   Security posture, matching the plan's Section J:
     · key server-side only
     · no add_context_from_internet equivalent — no web access, ever
     · request body size capped
     · only two known schema shapes accepted, so this endpoint cannot be
       repurposed as a general-purpose LLM proxy by anyone who finds it
   ═══════════════════════════════════════════════════════════════ */

const MODEL = 'claude-sonnet-4-5';
const MAX_PROMPT_CHARS = 12000;
const MAX_TOKENS = 1500;

// Only these top-level shapes are accepted. Anything else is rejected,
// which keeps the endpoint from becoming an open relay.
const ALLOWED_ROOT_KEYS = [
  ['items', 'needs_clarification', 'clarification_question'], // extraction
  ['estimates']                                               // range fallback
];

function shapeIsAllowed(schema) {
  if (!schema || typeof schema !== 'object' || !schema.properties) return false;
  const keys = Object.keys(schema.properties).sort();
  return ALLOWED_ROOT_KEYS.some(allowed => {
    const a = [...allowed].sort();
    return a.length === keys.length && a.every((k, i) => k === keys[i]);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'ANTHROPIC_API_KEY is not set. The app will run in demo mode.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Bad JSON' }); }
  }

  const prompt = body && body.prompt;
  const schema = body && body.response_json_schema;

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Missing prompt' });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(413).json({ error: 'Prompt too large' });
  }
  if (!shapeIsAllowed(schema)) {
    return res.status(400).json({ error: 'Unsupported response schema' });
  }

  // Structured output via a single forced tool call — the closest
  // equivalent to Base44's response_json_schema parameter.
  const payload = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    tools: [{
      name: 'emit_result',
      description: 'Return the result in the required structure.',
      input_schema: schema
    }],
    tool_choice: { type: 'tool', name: 'emit_result' },
    messages: [{ role: 'user', content: prompt }]
  };

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('Anthropic error', upstream.status, detail.slice(0, 500));
      return res.status(502).json({ error: 'upstream_error', status: upstream.status });
    }

    const data = await upstream.json();
    const toolUse = (data.content || []).find(b => b.type === 'tool_use');

    if (!toolUse || !toolUse.input) {
      return res.status(502).json({ error: 'no_structured_output' });
    }

    // Never cache a per-user meal parse.
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(toolUse.input);

  } catch (err) {
    console.error('invoke-llm failure', err);
    return res.status(502).json({ error: 'request_failed' });
  }
}
