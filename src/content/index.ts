import { detectProduct } from '../utils/productDetector'
import { MESSAGE_TYPES } from '../utils/messageTypes'
import type { Deal, DetectedProduct } from '../types/product'

const WIDGET_HOST_ID = 'productscout-widget-host'
const DISMISSED_KEY = `productscout-dismissed:${window.location.hostname}${window.location.pathname}`

function formatPrice(price: string, currency?: string): string {
  return [price, currency].filter(Boolean).join(' ')
}

function getFallbackDeals(product: DetectedProduct): Deal[] {
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

function requestDeals(product: DetectedProduct): Promise<Deal[]> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: MESSAGE_TYPES.SEARCH_DEALS,
        product,
      },
      (response: { deals?: Deal[] } | undefined) => {
        if (chrome.runtime.lastError) {
          resolve(getFallbackDeals(product))
          return
        }

        resolve(response?.deals?.length ? response.deals : getFallbackDeals(product))
      },
    )
  })
}

function waitForProduct(): Promise<DetectedProduct | null> {
  const maxAttempts = 10
  const retryDelayMs = 700
  let attempts = 0

  return new Promise((resolve) => {
    const scan = () => {
      attempts += 1
      const product = detectProduct()

      if (product || attempts >= maxAttempts) {
        resolve(product)
        return
      }

      window.setTimeout(scan, retryDelayMs)
    }

    scan()
  })
}

function getWidgetStyles(): string {
  return `
    :host {
      all: initial;
      color: #0f172a;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    .widget {
      position: fixed;
      right: 20px;
      top: 92px;
      z-index: 2147483647;
      width: 360px;
      max-width: calc(100vw - 40px);
      animation: slideIn 220ms ease-out;
    }

    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      box-shadow: 0 24px 70px rgb(15 23 42 / 24%);
      overflow: hidden;
    }

    .header {
      align-items: center;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      padding: 14px 16px;
    }

    .brand {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .header h2 {
      font-size: 16px;
      line-height: 1.2;
      margin: 4px 0 0;
    }

    .close {
      align-items: center;
      background: rgb(255 255 255 / 14%);
      border: 0;
      border-radius: 999px;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      font: inherit;
      font-size: 18px;
      height: 30px;
      justify-content: center;
      line-height: 1;
      width: 30px;
    }

    .body {
      display: grid;
      gap: 12px;
      padding: 14px;
    }

    .product,
    .deal {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      display: flex;
      gap: 10px;
      padding: 10px;
    }

    .product {
      background: #f8fafc;
    }

    .deal {
      color: inherit;
      text-decoration: none;
      transition: border-color 140ms ease, transform 140ms ease;
    }

    .deal:hover {
      border-color: #2563eb;
      transform: translateY(-1px);
    }

    img {
      background: #f1f5f9;
      border-radius: 10px;
      flex: 0 0 auto;
      height: 58px;
      object-fit: cover;
      width: 58px;
    }

    h3,
    p {
      margin: 0;
    }

    h3 {
      display: -webkit-box;
      font-size: 13px;
      line-height: 1.35;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .muted {
      color: #64748b;
      font-size: 12px;
      margin-top: 4px;
    }

    .price {
      color: #16a34a;
      font-size: 13px;
      font-weight: 800;
      margin-top: 6px;
    }

    .section-title {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }

    .section-title strong {
      font-size: 14px;
    }

    .section-title span {
      color: #64748b;
      font-size: 12px;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(28px);
      }

      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `
}

function removeWidget(host: HTMLElement) {
  sessionStorage.setItem(DISMISSED_KEY, 'true')
  host.remove()
}

function renderWidget(host: HTMLElement, shadowRoot: ShadowRoot, product: DetectedProduct, deals: Deal[]) {
  const productImage = product.image ? `<img src="${product.image}" alt="">` : ''
  const productPrice = product.price
    ? `<p class="price">Current: ${formatPrice(product.price, product.currency)}</p>`
    : ''

  const dealsMarkup = deals
    .map(
      (deal) => `
        <a class="deal" href="${deal.url}" target="_blank" rel="noreferrer">
          ${deal.image ? `<img src="${deal.image}" alt="">` : ''}
          <div>
            <h3>${deal.title}</h3>
            <p class="muted">${deal.seller}${deal.delivery ? ` · ${deal.delivery}` : ''}</p>
            <p class="price">${formatPrice(deal.price, deal.currency)}</p>
          </div>
        </a>
      `,
    )
    .join('')

  shadowRoot.innerHTML = `
    <style>${getWidgetStyles()}</style>
    <section class="widget">
      <div class="card">
        <header class="header">
          <div>
            <div class="brand">ProductScout</div>
            <h2>Better deals found</h2>
          </div>
          <button class="close" aria-label="Close ProductScout" type="button">×</button>
        </header>
        <div class="body">
          <article class="product">
            ${productImage}
            <div>
              <h3>${product.title}</h3>
              <p class="muted">${product.site}</p>
              ${productPrice}
            </div>
          </article>
          <div class="section-title">
            <strong>Suggested options</strong>
            <span>${deals.length} found</span>
          </div>
          ${dealsMarkup}
        </div>
      </div>
    </section>
  `

  shadowRoot.querySelector('.close')?.addEventListener('click', () => removeWidget(host))
}

async function bootProductScoutWidget() {
  if (sessionStorage.getItem(DISMISSED_KEY) === 'true') {
    return
  }

  if (document.getElementById(WIDGET_HOST_ID)) {
    return
  }

  const product = await waitForProduct()

  if (!product) {
    return
  }

  const host = document.createElement('div')
  host.id = WIDGET_HOST_ID
  document.documentElement.append(host)

  const shadowRoot = host.attachShadow({ mode: 'open' })
  const deals = await requestDeals(product)

  renderWidget(host, shadowRoot, product, deals)
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.GET_PRODUCT_INFO) {
    sendResponse({ product: detectProduct() })
  }

  return false
})

void bootProductScoutWidget()