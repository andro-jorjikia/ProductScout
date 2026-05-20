import type { DetectedProduct } from '../types/product'

function getMetaContent(selector: string): string | undefined {
  return document.querySelector<HTMLMetaElement>(selector)?.content?.trim()
}

function normalizeJsonLdItems(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (
    value &&
    typeof value === 'object' &&
    '@graph' in value &&
    Array.isArray((value as { '@graph': unknown })['@graph'])
  ) {
    return (value as { '@graph': unknown[] })['@graph']
  }

  return [value]
}

function isProductType(type: unknown): boolean {
  if (Array.isArray(type)) {
    return type.includes('Product')
  }

  return type === 'Product'
}

function getOfferValue(offers: unknown, key: 'price' | 'priceCurrency'): string | undefined {
  if (!offers) {
    return undefined
  }

  const offer = Array.isArray(offers) ? offers[0] : offers

  if (!offer || typeof offer !== 'object' || !(key in offer)) {
    return undefined
  }

  const value = (offer as Record<string, unknown>)[key]

  return value === undefined || value === null ? undefined : String(value)
}

function detectFromJsonLd(): Partial<DetectedProduct> | null {
  const scripts = Array.from(
    document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'),
  )

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || '{}')
      const items = normalizeJsonLdItems(parsed)

      for (const item of items) {
        if (!item || typeof item !== 'object') {
          continue
        }

        const product = item as Record<string, unknown>

        if (!isProductType(product['@type']) || !product.name) {
          continue
        }

        const image = Array.isArray(product.image) ? product.image[0] : product.image

        return {
          title: String(product.name),
          image: image ? String(image) : undefined,
          price: getOfferValue(product.offers, 'price'),
          currency: getOfferValue(product.offers, 'priceCurrency'),
        }
      }
    } catch {
      // Some websites ship invalid JSON-LD. Ignore that block and keep checking.
    }
  }

  return null
}

export function detectProduct(): DetectedProduct | null {
  const jsonLdProduct = detectFromJsonLd()

  const title =
    jsonLdProduct?.title ||
    getMetaContent('meta[property="og:title"]') ||
    getMetaContent('meta[name="twitter:title"]') ||
    document.querySelector('h1')?.textContent?.trim()

  if (!title) {
    return null
  }

  return {
    title,
    price: jsonLdProduct?.price,
    currency: jsonLdProduct?.currency,
    image:
      jsonLdProduct?.image ||
      getMetaContent('meta[property="og:image"]') ||
      getMetaContent('meta[name="twitter:image"]'),
    url: window.location.href,
    site: window.location.hostname,
  }
}
