export type DetectedProduct = {
    title: string
    price?: string
    currency?: string
    image?: string
    url: string
    site: string
  }
  export type Deal = {
    title: string
    price: string
    currency?: string
    image?: string
    url: string
    seller: string
    delivery?: string
    rating?: number
  }