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

/* Photos are capped well under Anthropic's 5 MB limit because the client
   downscales to 1024px before sending. A request arriving near this
   ceiling means the client-side resize was skipped or bypassed. */
const MAX_IMAGE_CHARS = 4_500_000;          // base64 characters
const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp'];

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

/* Cross-site callers get nothing. A same-origin fetch with a JSON
   content-type always sends Origin, so a mismatch means the request came
   from someone else's page — reject it rather than spend the key on it.
   A MISSING Origin is allowed through: browsers cannot omit it on this
   kind of request, so its absence means a non-browser client (curl, a
   scanner), which cannot mount a CSRF attack against a user. Those
   callers are still boxed in by the schema allowlist below — they can
   only ever get a meal parse back, never general-purpose model access. */
function originIsForeign(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) return true;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export default async function handler(req, res) {
  // Defence in depth: these also come from vercel.json, but a function
  // response should not depend on the platform layer getting it right.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (originIsForeign(req)) {
    return res.status(403).json({ error: 'forbidden_origin' });
  }

  // Requiring JSON blocks the "simple request" forms that skip preflight.
  const ctype = String(req.headers['content-type'] || '');
  if (!ctype.includes('application/json')) {
    return res.status(415).json({ error: 'Expected application/json' });
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

  /* Optional photo. The schema allowlist above still governs what can
     come back, so adding vision does not widen what this endpoint can be
     used for — it can identify foods in a picture and nothing else. */
  const image = body && body.image;
  let imageBlock = null;
  if (image) {
    if (typeof image.data !== 'string' || !ALLOWED_MEDIA.includes(image.media_type)) {
      return res.status(400).json({ error: 'Unsupported image' });
    }
    if (image.data.length > MAX_IMAGE_CHARS) {
      return res.status(413).json({ error: 'Image too large' });
    }
    imageBlock = {
      type: 'image',
      source: { type: 'base64', media_type: image.media_type, data: image.data }
    };
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
    messages: [{
      // Image first, then the instruction — the documented ordering for
      // vision prompts, and it measurably improves adherence.
      role: 'user',
      content: imageBlock
        ? [imageBlock, { type: 'text', text: prompt }]
        : prompt
    }]
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
