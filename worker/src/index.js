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

    const res = await fetch(`${REBRICKABLE}${path}`, {
      headers: { Authorization: `key ${env.REBRICKABLE_API_KEY}` },
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
