app.get('/api/deals', async (req, res) => {
    const q = String(req.query.q || '')
    const serpApiUrl = new URL('https://serpapi.com/search.json')
    serpApiUrl.searchParams.set('engine', 'google_shopping')
    serpApiUrl.searchParams.set('q', q)
    serpApiUrl.searchParams.set('api_key', process.env.SERPAPI_KEY!)
    const response = await fetch(serpApiUrl)
    const data = await response.json()
    const deals = data.shopping_results?.map((item) => ({
      title: item.title,
      price: item.extracted_price?.toString() || item.price,
      currency: 'USD',
      image: item.thumbnail,
      url: item.link,
      seller: item.source,
      delivery: item.delivery,
      rating: item.rating,
    })) ?? []
    res.json({ deals })
  })