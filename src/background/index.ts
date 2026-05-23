import type { Deal, DetectedProduct } from '../types/product'
import { MESSAGE_TYPES } from '../utils/messageTypes'

const SERVER_URL = 'http://localhost:3001'

function mockDeals(product: DetectedProduct): Deal[] {
  return [
    {
      title: `${product.title} — Best Price`,
      price: '99.99',
      currency: product.currency || 'USD',
      image: product.image,
      url: 'https://example.com/product-1',
      seller: 'Example Store',
      delivery: '2-5 days',
      rating: 4.6,
    },
    {
      title: `${product.title} — Fast Delivery`,
      price: '109.99',
      currency: product.currency || 'USD',
      image: product.image,
      url: 'https://example.com/product-2',
      seller: 'Fast Market',
      delivery: '1-2 days',
      rating: 4.8,
    },
  ]
}

async function searchDeals(product: DetectedProduct): Promise<Deal[]> {
  try {
    const url = `${SERVER_URL}/api/deals?q=${encodeURIComponent(product.title)}`
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })

    if (!response.ok) {
      console.warn(`[ProductScout] Server responded ${response.status}`)
      return mockDeals(product)
    }

    const data = (await response.json()) as { deals?: Deal[] }
    return data.deals?.length ? data.deals : mockDeals(product)
  } catch (err) {
    // Server not running or network error — fall back to mock data
    console.warn('[ProductScout] Backend unreachable, using mock deals:', err)
    return mockDeals(product)
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== MESSAGE_TYPES.SEARCH_DEALS) {
    return false
  }

  searchDeals(message.product as DetectedProduct).then((deals) => {
    sendResponse({ deals })
  })

  return true
})
