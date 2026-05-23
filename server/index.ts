import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 3001
const SCALESERP_KEY = process.env.SCALESERP_KEY || ''

// Simple in-memory cache — avoids burning API quota on repeated searches
const cache = new Map<string, { deals: Deal[]; ts: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

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

type SerpShoppingResult = {
  title?: string
  extracted_price?: number
  price?: string
  thumbnail?: string
  link?: string
  product_link?: string
  source?: string
  delivery?: string
  rating?: number
}

function normalizeDeal(item: SerpShoppingResult): Deal | null {
  const title = item.title?.trim()
  const price = item.extracted_price?.toString() || item.price?.replace(/[^0-9.]/g, '')
  const url = item.product_link || item.link

  if (!title || !price || !url) return null

  return {
    title,
    price,
    currency: 'USD',
    image: item.thumbnail,
    url,
    seller: item.source || 'Unknown',
    delivery: item.delivery,
    rating: item.rating,
  }
}

app.get('/api/deals', async (req, res) => {
  const query = String(req.query.q || '').trim()

  if (!query) {
    res.status(400).json({ error: 'Missing query parameter: q' })
    return
  }

  if (!SCALESERP_KEY) {
    res.status(503).json({ error: 'SCALESERP_KEY is not configured on the server.' })
    return
  }

  // Return cached result if still fresh
  const cached = cache.get(query)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    res.json({ deals: cached.deals, cached: true })
    return
  }

  try {
    const url = new URL('https://api.scaleserp.com/search')
    url.searchParams.set('api_key', SCALESERP_KEY)
    url.searchParams.set('q', query)
    url.searchParams.set('search_type', 'shopping')
    url.searchParams.set('num', '10')

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`SerpAPI returned ${response.status}`)
    }

    const data = (await response.json()) as { shopping_results?: SerpShoppingResult[] }

    const deals: Deal[] = (data.shopping_results ?? [])
      .map(normalizeDeal)
      .filter((d): d is Deal => d !== null)
      .slice(0, 8)

    cache.set(query, { deals, ts: Date.now() })

    res.json({ deals })
  } catch (err) {
    console.error('[ProductScout] SerpAPI error:', err)
    res.status(502).json({ error: 'Failed to fetch deals from search API.' })
  }
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', scaleserp: Boolean(SCALESERP_KEY) })
})

app.listen(PORT, () => {
  console.log(`ProductScout server running on http://localhost:${PORT}`)
  if (!SCALESERP_KEY) {
    console.warn('⚠  SCALESERP_KEY is not set — add it to server/.env')
  }
})
