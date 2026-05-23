import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 3001
const SEARCHAPI_KEY = (process.env.SEARCHAPI_KEY || '').trim()

function isValidSearchApiKey(key: string): boolean {
  if (!key || key.startsWith('http')) return false
  return key.length >= 8
}
const SEARCHAPI_GL = process.env.SEARCHAPI_GL || 'us'
const SEARCHAPI_HL = process.env.SEARCHAPI_HL || 'en'
const SEARCHAPI_LOCATION = process.env.SEARCHAPI_LOCATION || ''

const cache = new Map<string, { deals: Deal[]; ts: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000

app.use(cors({ origin: '*' }))
app.use(express.json())

type Deal = {
  title: string
  price: string
  currency?: string
  image?: string
  url: string
  seller: string
  delivery?: string
  rating?: number
}

type SearchApiShoppingItem = {
  title?: string
  extracted_price?: number
  price?: string
  thumbnail?: string
  image?: string
  link?: string
  product_link?: string
  seller?: string
  source?: string
  delivery?: string
  rating?: number
}

type SearchApiResponse = {
  shopping_results?: SearchApiShoppingItem[]
  shopping_ads?: SearchApiShoppingItem[]
  error?: string
}

function normalizeDeal(item: SearchApiShoppingItem): Deal | null {
  const title = item.title?.trim()
  const price =
    item.extracted_price != null
      ? String(item.extracted_price)
      : item.price?.replace(/[^0-9.]/g, '')
  const url = item.link || item.product_link

  if (!title || !price || !url) return null

  return {
    title,
    price,
    currency: 'USD',
    image: item.thumbnail || item.image,
    url,
    seller: item.seller || item.source || 'Unknown',
    delivery: item.delivery,
    rating: item.rating,
  }
}

function dedupeDeals(deals: Deal[]): Deal[] {
  const seen = new Set<string>()
  return deals.filter((deal) => {
    if (seen.has(deal.url)) return false
    seen.add(deal.url)
    return true
  })
}

async function fetchFromSearchApi(query: string): Promise<Deal[]> {
  const url = new URL('https://www.searchapi.io/api/v1/search')
  url.searchParams.set('engine', 'google_shopping')
  url.searchParams.set('api_key', SEARCHAPI_KEY)
  url.searchParams.set('q', query)
  url.searchParams.set('gl', SEARCHAPI_GL)
  url.searchParams.set('hl', SEARCHAPI_HL)
  url.searchParams.set('sort_by', 'price_low_to_high')

  if (SEARCHAPI_LOCATION) {
    url.searchParams.set('location', SEARCHAPI_LOCATION)
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`SearchAPI ${response.status}: ${body.slice(0, 200)}`)
  }

  const data = (await response.json()) as SearchApiResponse

  if (data.error) {
    throw new Error(data.error)
  }

  const combined = [...(data.shopping_results ?? []), ...(data.shopping_ads ?? [])]

  return dedupeDeals(
    combined
      .map(normalizeDeal)
      .filter((d): d is Deal => d !== null)
      .sort((a, b) => Number(a.price) - Number(b.price))
      .slice(0, 8),
  )
}

app.get('/api/deals', async (req, res) => {
  const query = String(req.query.q || '').trim()

  if (!query) {
    res.status(400).json({ error: 'Missing query parameter: q' })
    return
  }

  if (!isValidSearchApiKey(SEARCHAPI_KEY)) {
    res.status(503).json({
      error:
        'SEARCHAPI_KEY is missing or invalid. Paste only the key from searchapi.io dashboard (not the API URL).',
    })
    return
  }

  const cacheKey = `${SEARCHAPI_GL}:${SEARCHAPI_HL}:${query}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    res.json({ deals: cached.deals, cached: true })
    return
  }

  try {
    const deals = await fetchFromSearchApi(query)
    cache.set(cacheKey, { deals, ts: Date.now() })
    res.json({ deals })
  } catch (err) {
    console.error('[ProductScout] SearchAPI error:', err)
    res.status(502).json({ error: 'Failed to fetch deals from SearchAPI.' })
  }
})

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    provider: 'searchapi.io',
    searchapi: isValidSearchApiKey(SEARCHAPI_KEY),
    gl: SEARCHAPI_GL,
    hl: SEARCHAPI_HL,
  })
})

app.listen(PORT, () => {
  console.log(`ProductScout server → http://localhost:${PORT}`)
  console.log(`Provider: SearchAPI.io (google_shopping)`)
  if (!isValidSearchApiKey(SEARCHAPI_KEY)) {
    console.warn('⚠  Set SEARCHAPI_KEY in server/.env (dashboard key only, not a URL)')
  }
})
