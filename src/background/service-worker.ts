import type { Deal, DetectedProduct } from '../types/product'
import { MESSAGE_TYPES } from '../utils/messageTypes'

const SERVER_URL = 'http://localhost:3001'

async function searchDeals(product: DetectedProduct): Promise<{ deals: Deal[]; error?: string }> {
  try {
    const url = `${SERVER_URL}/api/deals?q=${encodeURIComponent(product.title)}`
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) })

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      return {
        deals: [],
        error: body.error || `Server error (${response.status}). Check server/.env SEARCHAPI_KEY.`,
      }
    }

    const data = (await response.json()) as { deals?: Deal[] }
    return { deals: data.deals ?? [] }
  } catch {
    return {
      deals: [],
      error: 'Backend not running. Start: cd server && npm run dev',
    }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== MESSAGE_TYPES.SEARCH_DEALS) {
    return false
  }

  searchDeals(message.product as DetectedProduct).then((result) => {
    sendResponse(result)
  })

  return true
})
