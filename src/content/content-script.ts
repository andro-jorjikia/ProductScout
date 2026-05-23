import { detectProduct } from '../utils/productDetector'
import { MESSAGE_TYPES } from '../utils/messageTypes'
import type { Deal, DetectedProduct } from '../types/product'

const WIDGET_HOST_ID = 'productscout-widget-host'
const DISMISSED_KEY = `productscout-dismissed:${window.location.hostname}${window.location.pathname}`

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatPrice(price: string, currency?: string): string {
  const sym = currency === 'USD' ? '$' : currency ? `${currency} ` : ''
  const num = parseFloat(price.replace(/[^0-9.]/g, ''))
  if (Number.isNaN(num)) return price
  return sym ? `${sym}${num.toFixed(2)}` : num.toFixed(2)
}

function parsePriceNum(price: string): number {
  return parseFloat(price.replace(/[^0-9.]/g, '')) || Infinity
}

function deliveryScore(delivery?: string): number {
  if (!delivery) return 50
  const d = delivery.toLowerCase()
  if (d.includes('same day') || d.includes('today')) return 1
  if (d.includes('1 day') || d.includes('1-2')) return 2
  if (d.includes('2-3') || d.includes('2-5')) return 4
  if (d.includes('free')) return 3
  return 10
}

function rankDeals(deals: Deal[]): {
  bestPrice: Deal | null
  fastest: Deal | null
  others: Deal[]
} {
  if (deals.length === 0) return { bestPrice: null, fastest: null, others: [] }

  const byPrice = [...deals].sort((a, b) => parsePriceNum(a.price) - parsePriceNum(b.price))
  const bestPrice = byPrice[0] ?? null
  const fastest = [...deals].sort((a, b) => deliveryScore(a.delivery) - deliveryScore(b.delivery))[0] ?? null

  const highlightIds = new Set([bestPrice?.url, fastest?.url].filter(Boolean))
  const others = deals.filter((d) => !highlightIds.has(d.url))

  return { bestPrice, fastest, others }
}

function requestDeals(product: DetectedProduct): Promise<{ deals: Deal[]; error?: string }> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      resolve({ deals: [], error: 'Search timed out. Is the server running?' })
    }, 15000)

    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPES.SEARCH_DEALS, product },
      (response: { deals?: Deal[]; error?: string } | undefined) => {
        window.clearTimeout(timeout)
        if (chrome.runtime.lastError) {
          resolve({ deals: [], error: 'Extension could not reach the backend.' })
          return
        }
        resolve({ deals: response?.deals ?? [], error: response?.error })
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
      font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .ps-widget {
      position: fixed;
      right: 24px;
      top: 80px;
      z-index: 2147483647;
      width: 380px;
      max-width: calc(100vw - 32px);
      animation: ps-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ps-card {
      background: linear-gradient(165deg, #1a1f2e 0%, #12151c 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.04),
        0 24px 48px -12px rgba(0, 0, 0, 0.5),
        0 0 80px -20px rgba(16, 185, 129, 0.15);
      overflow: hidden;
    }

    .ps-header {
      align-items: flex-start;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      justify-content: space-between;
      padding: 18px 18px 16px;
    }

    .ps-logo {
      align-items: center;
      display: flex;
      gap: 10px;
    }

    .ps-logo-icon {
      align-items: center;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
      color: #fff;
      display: flex;
      font-size: 18px;
      height: 40px;
      justify-content: center;
      width: 40px;
    }

    .ps-brand {
      color: #10b981;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .ps-title {
      color: #f8fafc;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.2;
      margin-top: 2px;
    }

    .ps-subtitle {
      color: rgba(248, 250, 252, 0.5);
      font-size: 12px;
      margin-top: 4px;
    }

    .ps-close {
      align-items: center;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      color: rgba(248, 250, 252, 0.7);
      cursor: pointer;
      display: flex;
      font-size: 20px;
      height: 32px;
      justify-content: center;
      line-height: 1;
      transition: background 0.2s, color 0.2s, transform 0.15s;
      width: 32px;
    }

    .ps-close:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      transform: scale(1.05);
    }

    .ps-body {
      max-height: min(70vh, 520px);
      overflow-y: auto;
      padding: 16px;
      scrollbar-color: rgba(255,255,255,0.15) transparent;
      scrollbar-width: thin;
    }

    .ps-body::-webkit-scrollbar { width: 6px; }
    .ps-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }

    .ps-current {
      align-items: center;
      animation: ps-fade-up 0.4s ease 0.1s both;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px;
    }

    .ps-current img {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 10px;
      flex-shrink: 0;
      height: 64px;
      object-fit: cover;
      width: 64px;
    }

    .ps-current-label {
      color: rgba(248, 250, 252, 0.45);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .ps-current h3 {
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      color: #e2e8f0;
      display: -webkit-box;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.35;
      margin-top: 4px;
      overflow: hidden;
    }

    .ps-current-price {
      color: #94a3b8;
      font-size: 12px;
      margin-top: 6px;
    }

    .ps-current-price strong {
      color: #f8fafc;
      font-size: 15px;
      font-weight: 700;
    }

    .ps-section-label {
      align-items: center;
      animation: ps-fade-up 0.35s ease both;
      color: rgba(248, 250, 252, 0.55);
      display: flex;
      font-size: 11px;
      font-weight: 600;
      gap: 8px;
      letter-spacing: 0.06em;
      margin: 16px 0 10px;
      text-transform: uppercase;
    }

    .ps-section-label::after {
      background: rgba(255, 255, 255, 0.08);
      content: "";
      flex: 1;
      height: 1px;
    }

    .ps-highlight {
      animation: ps-fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
      border-radius: 14px;
      color: inherit;
      display: block;
      margin-bottom: 10px;
      padding: 14px;
      position: relative;
      text-decoration: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .ps-highlight:hover {
      transform: translateY(-2px);
    }

    .ps-highlight--price {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.06) 100%);
      border: 1px solid rgba(16, 185, 129, 0.35);
      box-shadow: 0 0 24px -4px rgba(16, 185, 129, 0.25);
    }

    .ps-highlight--price:hover {
      box-shadow: 0 8px 32px -8px rgba(16, 185, 129, 0.4);
    }

    .ps-highlight--fast {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0.06) 100%);
      border: 1px solid rgba(99, 102, 241, 0.35);
      box-shadow: 0 0 24px -4px rgba(99, 102, 241, 0.2);
    }

    .ps-highlight--fast:hover {
      box-shadow: 0 8px 32px -8px rgba(99, 102, 241, 0.35);
    }

    .ps-badge {
      border-radius: 6px;
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin-bottom: 10px;
      padding: 4px 8px;
      text-transform: uppercase;
    }

    .ps-badge--price {
      background: rgba(16, 185, 129, 0.25);
      color: #34d399;
    }

    .ps-badge--fast {
      background: rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
    }

    .ps-deal-row {
      align-items: center;
      display: flex;
      gap: 12px;
    }

    .ps-deal-row img {
      border-radius: 8px;
      flex-shrink: 0;
      height: 48px;
      object-fit: cover;
      width: 48px;
    }

    .ps-deal-info { flex: 1; min-width: 0; }

    .ps-deal-info h4 {
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      color: #f1f5f9;
      display: -webkit-box;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.3;
      overflow: hidden;
    }

    .ps-deal-meta {
      color: rgba(248, 250, 252, 0.45);
      font-size: 11px;
      margin-top: 4px;
    }

    .ps-deal-price {
      color: #10b981;
      flex-shrink: 0;
      font-size: 16px;
      font-weight: 800;
      text-align: right;
    }

    .ps-deal-list .ps-deal-item {
      align-items: center;
      animation: ps-fade-up 0.4s ease both;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      color: inherit;
      display: flex;
      gap: 10px;
      margin-bottom: 8px;
      padding: 10px 12px;
      text-decoration: none;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
    }

    .ps-deal-list .ps-deal-item:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.12);
      transform: translateX(4px);
    }

    .ps-deal-list .ps-deal-item img {
      border-radius: 8px;
      height: 44px;
      object-fit: cover;
      width: 44px;
    }

    .ps-deal-list .ps-deal-item h4 {
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      color: #e2e8f0;
      display: -webkit-box;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.3;
      overflow: hidden;
    }

    .ps-deal-list .ps-deal-price-sm {
      color: #34d399;
      flex-shrink: 0;
      font-size: 14px;
      font-weight: 700;
    }

    .ps-loading {
      padding: 28px 20px;
      text-align: center;
    }

    .ps-loader-ring {
      animation: ps-spin 0.9s linear infinite;
      border: 3px solid rgba(16, 185, 129, 0.15);
      border-radius: 50%;
      border-top-color: #10b981;
      height: 40px;
      margin: 0 auto 16px;
      width: 40px;
    }

    .ps-loading p {
      animation: ps-pulse 1.5s ease infinite;
      color: rgba(248, 250, 252, 0.6);
      font-size: 13px;
    }

    .ps-loading-dots span {
      animation: ps-dot 1.2s ease infinite;
      display: inline-block;
    }

    .ps-loading-dots span:nth-child(2) { animation-delay: 0.15s; }
    .ps-loading-dots span:nth-child(3) { animation-delay: 0.3s; }

    .ps-empty {
      animation: ps-fade-up 0.4s ease;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 12px;
      color: #fca5a5;
      font-size: 13px;
      line-height: 1.5;
      padding: 14px;
    }

    .ps-powered {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      color: rgba(248, 250, 252, 0.25);
      font-size: 10px;
      padding: 10px 16px;
      text-align: center;
    }

    @keyframes ps-enter {
      from { opacity: 0; transform: translateX(24px) scale(0.96); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }

    @keyframes ps-fade-up {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes ps-spin {
      to { transform: rotate(360deg); }
    }

    @keyframes ps-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    @keyframes ps-dot {
      0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
      40% { opacity: 1; transform: translateY(-4px); }
    }
  `
}

function bindClose(host: HTMLElement, shadowRoot: ShadowRoot) {
  shadowRoot.querySelector('.ps-close')?.addEventListener('click', () => removeWidget(host))
}

function removeWidget(host: HTMLElement) {
  sessionStorage.setItem(DISMISSED_KEY, 'true')
  host.remove()
}

function renderDealHighlight(
  deal: Deal,
  type: 'price' | 'fast',
  delay: string,
): string {
  const badge =
    type === 'price'
      ? '<span class="ps-badge ps-badge--price">💰 Lowest price</span>'
      : '<span class="ps-badge ps-badge--fast">⚡ Fastest delivery</span>'
  const img = deal.image ? `<img src="${escapeHtml(deal.image)}" alt="">` : ''
  const delivery = deal.delivery ? ` · ${escapeHtml(deal.delivery)}` : ''
  const rating = deal.rating ? ` · ★ ${deal.rating}` : ''

  return `
    <a
      class="ps-highlight ps-highlight--${type}"
      href="${escapeHtml(deal.url)}"
      target="_blank"
      rel="noreferrer"
      style="animation-delay: ${delay}"
    >
      ${badge}
      <div class="ps-deal-row">
        ${img}
        <div class="ps-deal-info">
          <h4>${escapeHtml(deal.title)}</h4>
          <p class="ps-deal-meta">${escapeHtml(deal.seller)}${delivery}${rating}</p>
        </div>
        <div class="ps-deal-price">${escapeHtml(formatPrice(deal.price, deal.currency))}</div>
      </div>
    </a>
  `
}

function renderLoadingWidget(host: HTMLElement, shadowRoot: ShadowRoot) {
  shadowRoot.innerHTML = `
    <style>${getWidgetStyles()}</style>
    <section class="ps-widget">
      <div class="ps-card">
        <header class="ps-header">
          <div class="ps-logo">
            <div class="ps-logo-icon">🔍</div>
            <div>
              <div class="ps-brand">ProductScout</div>
              <div class="ps-title">Finding deals</div>
              <div class="ps-subtitle">Searching Google Shopping</div>
            </div>
          </div>
          <button class="ps-close" type="button" aria-label="Close">×</button>
        </header>
        <div class="ps-loading">
          <div class="ps-loader-ring"></div>
          <p>Scanning for better prices<span class="ps-loading-dots"><span>.</span><span>.</span><span>.</span></span></p>
        </div>
      </div>
    </section>
  `
  bindClose(host, shadowRoot)
}

function renderWidget(
  host: HTMLElement,
  shadowRoot: ShadowRoot,
  product: DetectedProduct,
  deals: Deal[],
  error?: string,
) {
  const { bestPrice, fastest, others } = rankDeals(deals)
  const showFastest =
    fastest && bestPrice && fastest.url !== bestPrice.url && deliveryScore(fastest.delivery) < 8

  const currentImg = product.image ? `<img src="${escapeHtml(product.image)}" alt="">` : ''
  const currentPriceBlock = product.price
    ? `<p class="ps-current-price">On this page: <strong>${escapeHtml(formatPrice(product.price, product.currency))}</strong></p>`
    : ''

  let dealsHtml = ''

  if (error || deals.length === 0) {
    dealsHtml = `<div class="ps-empty">${escapeHtml(error || 'No better offers found on Google Shopping.')}</div>`
  } else {
    if (bestPrice) {
      dealsHtml += renderDealHighlight(bestPrice, 'price', '0.15s')
    }
    if (showFastest && fastest) {
      dealsHtml += renderDealHighlight(fastest, 'fast', '0.25s')
    }
    if (others.length > 0) {
      dealsHtml += `<div class="ps-section-label">More options</div><div class="ps-deal-list">`
      others.forEach((deal, i) => {
        const img = deal.image ? `<img src="${escapeHtml(deal.image)}" alt="">` : ''
        dealsHtml += `
          <a
            class="ps-deal-item"
            href="${escapeHtml(deal.url)}"
            target="_blank"
            rel="noreferrer"
            style="animation-delay: ${0.3 + i * 0.06}s"
          >
            ${img}
            <div class="ps-deal-info">
              <h4>${escapeHtml(deal.title)}</h4>
              <p class="ps-deal-meta">${escapeHtml(deal.seller)}${deal.delivery ? ` · ${escapeHtml(deal.delivery)}` : ''}</p>
            </div>
            <span class="ps-deal-price-sm">${escapeHtml(formatPrice(deal.price, deal.currency))}</span>
          </a>
        `
      })
      dealsHtml += `</div>`
    }
  }

  shadowRoot.innerHTML = `
    <style>${getWidgetStyles()}</style>
    <section class="ps-widget">
      <div class="ps-card">
        <header class="ps-header">
          <div class="ps-logo">
            <div class="ps-logo-icon">✓</div>
            <div>
              <div class="ps-brand">ProductScout</div>
              <div class="ps-title">${deals.length > 0 ? `${deals.length} deals found` : 'No deals'}</div>
              <div class="ps-subtitle">Compared via Google Shopping</div>
            </div>
          </div>
          <button class="ps-close" type="button" aria-label="Close">×</button>
        </header>
        <div class="ps-body">
          <article class="ps-current">
            ${currentImg}
            <div>
              <div class="ps-current-label">You're viewing</div>
              <h3>${escapeHtml(product.title)}</h3>
              <p class="ps-deal-meta" style="margin-top:4px;color:rgba(248,250,252,0.4)">${escapeHtml(product.site)}</p>
              ${currentPriceBlock}
            </div>
          </article>
          ${dealsHtml}
        </div>
        <div class="ps-powered">Powered by Google Shopping · SearchAPI</div>
      </div>
    </section>
  `
  bindClose(host, shadowRoot)
}

async function bootProductScoutWidget() {
  if (sessionStorage.getItem(DISMISSED_KEY) === 'true') return
  if (document.getElementById(WIDGET_HOST_ID)) return

  const host = document.createElement('div')
  host.id = WIDGET_HOST_ID
  document.documentElement.append(host)

  const shadowRoot = host.attachShadow({ mode: 'open' })
  renderLoadingWidget(host, shadowRoot)

  const product = await waitForProduct()
  if (!product) {
    removeWidget(host)
    return
  }

  const { deals, error } = await requestDeals(product)
  renderWidget(host, shadowRoot, product, deals, error)
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.GET_PRODUCT_INFO) {
    sendResponse({ product: detectProduct() })
    return true
  }
  return false
})

void bootProductScoutWidget()
