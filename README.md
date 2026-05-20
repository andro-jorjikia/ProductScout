# 🔍 ProductScout

> A smart Chrome Extension that detects products you're browsing and instantly finds better deals across the web — comparing prices, delivery times, and seller ratings in real time.

![ProductScout Banner](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## ✨ What It Does

When you visit any product page online, **ProductScout** automatically:

1. **Detects the product** you're viewing (name, price, category)
2. **Searches across multiple platforms** for the same or equivalent product
3. **Shows you a ranked list** of alternatives sorted by price, delivery speed, and seller trust score
4. **Highlights the best deal** so you never overpay again

---

## 🚀 Features

- 🛒 **Auto Product Detection** — Reads product info from any e-commerce page using Schema.org, Open Graph, and DOM parsing
- 💰 **Real-time Price Comparison** — Compares prices across major platforms instantly
- 🚚 **Delivery Info** — Shows estimated delivery time and shipping cost per seller
- ⭐ **Seller Ratings** — Surfaces trust scores and review counts
- 🎨 **Clean React UI** — Minimal, non-intrusive popup sidebar built with React + Tailwind
- ⚡ **Fast & Lightweight** — Built with Vite, loads in milliseconds
- 🔒 **Privacy First** — No personal data collected, no tracking

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **UI Framework** | React 19 + TypeScript |
| **Build Tool** | Vite 8 + `@crxjs/vite-plugin` |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Extension API** | Chrome Manifest V3 |
| **Backend API** | Node.js + Express |
| **Price Data** | SerpAPI (Google Shopping) / Affiliate APIs |
| **Hosting** | Railway / Render |

---

## 📁 Project Structure

```
ProductScout/
├── public/
│   ├── manifest.json          # Chrome Extension manifest (MV3)
│   └── icons/                 # Extension icons (16, 48, 128px)
├── src/
│   ├── background/
│   │   └── index.ts           # Service Worker — handles API calls
│   ├── content/
│   │   └── index.tsx          # Content Script — injected into pages
│   ├── popup/
│   │   ├── Popup.tsx          # Main popup React component
│   │   └── index.tsx          # Popup entry point
│   ├── components/
│   │   ├── ProductCard.tsx    # Detected product display
│   │   ├── DealCard.tsx       # Individual deal result card
│   │   └── DealsList.tsx      # Sorted list of deals
│   └── utils/
│       ├── productDetector.ts # DOM + Schema.org product extraction
│       └── priceComparator.ts # API calls for price comparison
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Google Chrome / Chromium browser

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ProductScout.git
cd ProductScout

# Install dependencies
npm install

# Start development build (with hot reload)
npm run dev
```

### Load in Chrome

1. Run `npm run build` to generate the `dist/` folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer Mode** (top right toggle)
4. Click **"Load unpacked"**
5. Select the `dist/` folder
6. ProductScout icon will appear in your toolbar ✅

---

## 🗺️ Roadmap

- [x] Project setup (Vite + React + TypeScript)
- [ ] Chrome Manifest V3 configuration
- [ ] Content script — product detection engine
- [ ] Background service worker — API communication
- [ ] Popup UI — product display + deals list
- [ ] Backend API — price comparison aggregator
- [ ] SerpAPI / Google Shopping integration
- [ ] Tailwind + shadcn/ui styling
- [ ] Support for Georgian e-commerce sites (mymarket.ge, extra.ge, etc.)
- [ ] Chrome Web Store submission

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👤 Author

Built with ❤️ by [@androjorjikia](https://github.com/androjorjikia)
