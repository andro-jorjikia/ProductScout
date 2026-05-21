import type { Deal, DetectedProduct } from '../types/product'
import { MESSAGE_TYPES } from '../utils/messageTypes'

async function searchDeals(product: DetectedProduct): Promise<Deal[]> {
  // MVP mock data. Later this function should call your backend API.
  return [
    {
      title: `${product.title} - Better Price Option`,
      price: '99.99',
      currency: product.currency || 'USD',
      image: product.image,
      url: 'https://example.com/product-1',
      seller: 'Example Store',
      delivery: '2-5 days',
      rating: 4.6,
    },
    {
      title: `${product.title} - Fast Delivery Option`,
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== MESSAGE_TYPES.SEARCH_DEALS) {
    return false
  }

  searchDeals(message.product).then((deals) => {
    sendResponse({ deals })
  })

  return true
})
