// Cloudflare Worker proxy for Rebrickable API
// NOTE: Currently blocked by Cloudflare error 1106 because rebrickable.com
// is also behind Cloudflare (CF-to-CF fetch limitation). Kept for future use
// when deployed behind a non-Cloudflare proxy or custom domain.

const REBRICKABLE = 'https://rebrickable.com/api/v3/lego'
const ALLOWED_ORIGINS = [
  'https://matjoos.github.io',
  'http://localhost:5173',
]

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)
    const path = url.pathname + url.search

    const apiKey = env.REBRICKABLE_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const res = await fetch(`${REBRICKABLE}${path}`, {
      headers: {
        'Authorization': `key ${apiKey}`,
        'Accept': 'application/json',
      },
    })

    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
  },
}
