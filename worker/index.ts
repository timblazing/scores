// Edge cache for ESPN. Proxies /api/espn/site/<path> to site.api.espn.com, caches it
// with the Cache API, and adds CORS. Only the paths the app uses are allowed; this is
// not an open proxy. Everything outside /api/* never reaches this Worker
// (assets.runWorkerFirst).
//
// site.web.api.espn.com (athletes, search) is not proxied: it returns 403 to requests
// from Cloudflare Workers whatever the headers, so the client calls it directly.

interface Ctx {
  waitUntil(p: Promise<unknown>): void
}

const HOSTS = { site: 'site.api.espn.com' } as const

const L = '(?:football/nfl|basketball/nba)'
const MIN = 60

// [host, path pattern, TTL seconds]. `live` TTLs drop when a game is in progress.
const ROUTES: [keyof typeof HOSTS, RegExp, number | 'live'][] = [
  ['site', new RegExp(`^/apis/site/v2/sports/${L}/(?:scoreboard|summary)$`), 'live'],
  ['site', new RegExp(`^/apis/site/v2/sports/${L}/teams/\\d+/schedule$`), 2 * MIN],
  ['site', new RegExp(`^/apis/site/v2/sports/${L}/teams/\\d+/roster$`), 30 * MIN],
  ['site', new RegExp(`^/apis/site/v2/sports/${L}/news$`), 5 * MIN],
  ['site', new RegExp(`^/apis/v2/sports/${L}/standings$`), 5 * MIN],
]

// Query params the client sends. Anything else is dropped so it can't fragment the cache.
const PARAMS = new Set(['dates', 'week', 'seasontype', 'limit', 'event', 'level', 'team'])

const LIVE_TTL = 10
const IDLE_TTL = MIN

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const fail = (status: number, msg: string) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

export default {
  async fetch(request: Request, _env: unknown, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url)
    const m = url.pathname.match(/^\/api\/espn\/(site)(\/.*)$/)
    if (!m) return fail(404, 'Not found')
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    if (request.method !== 'GET' && request.method !== 'HEAD') return fail(405, 'Method not allowed')

    const host = m[1] as keyof typeof HOSTS
    const path = m[2]
    const route = ROUTES.find(([h, re]) => h === host && re.test(path))
    if (!route) return fail(403, 'Path not allowed')

    const upstream = new URL(`https://${HOSTS[host]}${path}`)
    for (const [k, v] of [...url.searchParams].sort(([a], [b]) => a.localeCompare(b)))
      if (PARAMS.has(k) && v.length <= 100) upstream.searchParams.append(k, v)

    const cache = await caches.open('espn')
    const key = new Request(upstream.toString())
    const hit = await cache.match(key)
    if (hit) return withHeaders(hit, 'HIT')

    const res = await fetch(upstream.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; scores.blasingame.dev)' },
    })
    if (!res.ok) return fail(res.status === 404 ? 404 : 502, `ESPN returned ${res.status}`)

    const body = await res.text()
    const ttl = route[2] === 'live' ? (/"state":\s*"in"/.test(body) ? LIVE_TTL : IDLE_TTL) : route[2]
    const stored = new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${ttl}`,
        'X-Edge-TTL': String(ttl),
      },
    })
    ctx.waitUntil(cache.put(key, stored.clone()))
    return withHeaders(stored, 'MISS')
  },
}

// Browsers revalidate every time; freshness is the edge TTL plus TanStack Query's staleTime.
function withHeaders(res: Response, status: 'HIT' | 'MISS') {
  const out = new Response(res.body, res)
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v)
  out.headers.set('Cache-Control', 'no-cache')
  out.headers.set('X-Edge-Cache', status)
  return out
}
