import { useEffect, useState } from 'react'
import type { Deal, DetectedProduct } from '../types/product'
import { MESSAGE_TYPES } from '../utils/messageTypes'

type PopupStatus = 'loading' | 'ready' | 'empty' | 'error'

function formatPrice(price: string, currency?: string): string {
  return [price, currency].filter(Boolean).join(' ')
}

export default function Popup() {
  const [status, setStatus] = useState<PopupStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string>()
  const [product, setProduct] = useState<DetectedProduct | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])

  useEffect(() => {
    async function loadProductAndDeals() {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })

      if (!activeTab?.id) {
        setStatus('error')
        setErrorMessage('Active tab was not found.')
        return
      }

      chrome.tabs.sendMessage(
        activeTab.id,
        { type: MESSAGE_TYPES.GET_PRODUCT_INFO },
        (productResponse: { product?: DetectedProduct | null } | undefined) => {
          if (chrome.runtime.lastError) {
            setStatus('error')
            setErrorMessage('Open a regular product page and try again.')
            return
          }

          const detectedProduct = productResponse?.product ?? null
          setProduct(detectedProduct)

          if (!detectedProduct) {
            setStatus('empty')
            return
          }

          chrome.runtime.sendMessage(
            {
              type: MESSAGE_TYPES.SEARCH_DEALS,
              product: detectedProduct,
            },
            (dealResponse: { deals?: Deal[] } | undefined) => {
              if (chrome.runtime.lastError) {
                setStatus('error')
                setErrorMessage('Could not search deals right now.')
                return
              }

              setDeals(dealResponse?.deals ?? [])
              setStatus('ready')
            },
          )
        },
      )
    }

    loadProductAndDeals().catch(() => {
      setStatus('error')
      setErrorMessage('Something went wrong while loading ProductScout.')
    })
  }, [])

  return (
    <main className="popup">
      <header className="popup__header">
        <div>
          <p className="popup__eyebrow">ProductScout</p>
          <h1>Better deals, faster.</h1>
        </div>
      </header>

      {status === 'loading' && (
        <section className="state-card">
          <div className="loader" />
          <p>Scanning this page for product details...</p>
        </section>
      )}

      {status === 'error' && (
        <section className="state-card">
          <h2>Could not scan this page</h2>
          <p>{errorMessage}</p>
        </section>
      )}

      {status === 'empty' && (
        <section className="state-card">
          <h2>No product detected</h2>
          <p>Try opening a product detail page on an ecommerce website.</p>
        </section>
      )}

      {product && status === 'ready' && (
        <>
          <section className="product-card">
            {product.image && (
              <img className="product-card__image" src={product.image} alt={product.title} />
            )}

            <div className="product-card__content">
              <span className="product-card__site">{product.site}</span>
              <h2>{product.title}</h2>
              {product.price && (
                <p className="product-card__price">
                  Current price: {formatPrice(product.price, product.currency)}
                </p>
              )}
            </div>
          </section>

          <section className="deals">
            <div className="section-title">
              <h2>Suggested options</h2>
              <span>{deals.length} found</span>
            </div>

            {deals.map((deal) => (
              <a
                className="deal-card"
                href={deal.url}
                key={deal.url}
                rel="noreferrer"
                target="_blank"
              >
                {deal.image && <img className="deal-card__image" src={deal.image} alt="" />}

                <div className="deal-card__content">
                  <h3>{deal.title}</h3>
                  <p className="deal-card__seller">{deal.seller}</p>
                  <div className="deal-card__meta">
                    <strong>{formatPrice(deal.price, deal.currency)}</strong>
                    {deal.delivery && <span>{deal.delivery}</span>}
                    {deal.rating && <span>{deal.rating.toFixed(1)} rating</span>}
                  </div>
                </div>
              </a>
            ))}
          </section>
        </>
      )}
    </main>
  )
}
