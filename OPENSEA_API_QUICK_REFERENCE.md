# OpenSea API v2 - Quick Reference Guide

## 📖 Import Statement

```typescript
import {
  // Events
  getEvents,
  getEventsByAccount,
  getEventsByCollection,
  getEventsByNFT,
  
  // Analytics
  getTraits,
  getCollectionStats,
  
  // Listings
  getAllListingsByCollection,
  getBestListingByNFT,
  getBestListingsByCollection,
  
  // Offers
  getAllOffersByCollection,
  getBestOfferByNFT,
  getCollectionOffers,
  getItemOffers,
  getTraitOffers,
  
  // Orders
  getOrder,
  
  // NFT Data
  getNFT,
  getNFTsByContract,
  getNFTsByWallet,
  getCollection,
  
  // Utilities
  getOpenSeaURL,
  getOpenSeaCollectionURL,
  
  // Types
  EventType,
  EventsResponse,
  AssetEvent,
  Listing,
  Offer,
  TraitsResponse,
} from '@/lib/opensea';
```

## 🚀 Common Use Cases

### 1. Get Recent Sales for a Collection

```typescript
const recentSales = await getEventsByCollection('boredapeyachtclub', {
  event_type: ['sale'],
  limit: 50
});

recentSales.asset_events.forEach(event => {
  console.log(`Sold: ${event.nft?.name} at ${event.event_timestamp}`);
});
```

### 2. Get All Wallet Activity

```typescript
const walletActivity = await getEventsByAccount('0x123...', {
  event_type: ['sale', 'transfer', 'order'],
  limit: 100
});

console.log(`Total events: ${walletActivity.asset_events.length}`);
```

### 3. Get NFT History

```typescript
const nftHistory = await getEventsByNFT(
  'arbitrum',
  '0xContract...',
  '1234',
  { limit: 20 }
);

console.log(`This NFT has ${nftHistory.asset_events.length} events`);
```

### 4. Get Collection Traits

```typescript
const traits = await getTraits('boredapeyachtclub');

Object.entries(traits.categories).forEach(([name, type]) => {
  console.log(`Trait: ${name} (${type})`);
  console.log('Values:', traits.counts[name]);
});
```

### 5. Get Floor Price (Best Listing)

```typescript
const listings = await getBestListingsByCollection('boredapeyachtclub', 1);
const floorPrice = listings.listings[0]?.current_price;

console.log(`Floor price: ${floorPrice} wei`);
```

### 6. Get Best Offer for NFT

```typescript
const bestOffer = await getBestOfferByNFT(
  'arbitrum',
  '0xContract...',
  '1234'
);

if (bestOffer) {
  console.log(`Best offer: ${bestOffer.current_price} wei`);
  console.log(`From: ${bestOffer.maker.address}`);
}
```

### 7. Get All Offers on a Collection

```typescript
const { offers, next } = await getCollectionOffers('boredapeyachtclub', 50);

console.log(`Total offers: ${offers.length}`);
offers.forEach(offer => {
  console.log(`Offer: ${offer.current_price} wei`);
});
```

### 8. Get Offers for Specific Trait

```typescript
const traitOffers = await getTraitOffers(
  'boredapeyachtclub',
  'Background',
  'Blue',
  50
);

console.log(`Offers for Blue Background: ${traitOffers.offers.length}`);
```

## 📊 Pagination Example

```typescript
async function getAllSales(collectionSlug: string) {
  let allSales: AssetEvent[] = [];
  let next: string | null = null;
  
  do {
    const response = await getEventsByCollection(collectionSlug, {
      event_type: ['sale'],
      limit: 50,
      next: next || undefined
    });
    
    allSales.push(...response.asset_events);
    next = response.next;
    
    console.log(`Loaded ${allSales.length} sales...`);
  } while (next);
  
  return allSales;
}
```

## 🎯 Event Type Filters

```typescript
// Sales only
const sales = await getEvents({ event_type: ['sale'] });

// Transfers only
const transfers = await getEvents({ event_type: ['transfer'] });

// Orders and cancellations
const orders = await getEvents({ event_type: ['order', 'cancel'] });

// Everything
const all = await getEvents({ 
  event_type: ['sale', 'order', 'cancel', 'transfer', 'redemption'] 
});
```

## 🕐 Time-Based Filtering

```typescript
// Last 24 hours
const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
const recent = await getEvents({
  after: oneDayAgo,
  event_type: ['sale']
});

// Last week
const weekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
const lastWeek = await getEvents({
  after: weekAgo,
  before: oneDayAgo,
  event_type: ['sale']
});

// Specific date range
const startDate = new Date('2024-01-01').getTime() / 1000;
const endDate = new Date('2024-12-31').getTime() / 1000;
const yearSales = await getEvents({
  after: startDate,
  before: endDate,
  event_type: ['sale']
});
```

## 💰 Price Formatting

```typescript
import { formatPrice } from '@/lib/opensea';

// Convert wei to ETH
const priceWei = '1000000000000000000'; // 1 ETH in wei
const priceETH = formatPrice(priceWei, 18);
console.log(`Price: ${priceETH} ETH`);

// Manual conversion
const price = Number(priceWei) / Math.pow(10, 18);
console.log(`Price: ${price.toFixed(4)} ETH`);
```

## 🔗 Generate OpenSea URLs

```typescript
import { getOpenSeaURL, getOpenSeaCollectionURL } from '@/lib/opensea';

// NFT URL
const nftURL = getOpenSeaURL('0xContract...', '1234', 'arbitrum');
// https://opensea.io/assets/arbitrum/0xContract.../1234

// Collection URL
const collectionURL = getOpenSeaCollectionURL('0xContract...', 'arbitrum');
// https://opensea.io/assets/arbitrum/0xContract...
```

## 🌐 Supported Chains

```typescript
// Mainnets
'ethereum', 'arbitrum', 'polygon', 'optimism', 'base', 
'avalanche', 'bsc', 'blast', 'zora', 'klaytn', 'solana'

// Testnets
'sepolia', 'arbitrum-sepolia', 'base-sepolia', 
'optimism-sepolia', 'mumbai', 'zora-sepolia'
```

## ⚡ Performance Tips

### 1. Use Specific Endpoints
```typescript
// ❌ Inefficient - Gets all events
const allEvents = await getEvents({ limit: 1000 });

// ✅ Efficient - Gets only what you need
const sales = await getEventsByCollection('collection-slug', {
  event_type: ['sale'],
  limit: 50
});
```

### 2. Implement Caching
```typescript
const cache = new Map();

async function getCachedCollectionStats(slug: string) {
  if (cache.has(slug)) {
    return cache.get(slug);
  }
  
  const stats = await getCollectionStats(slug);
  cache.set(slug, stats);
  
  // Clear cache after 5 minutes
  setTimeout(() => cache.delete(slug), 5 * 60 * 1000);
  
  return stats;
}
```

### 3. Use Pagination Wisely
```typescript
// ❌ Don't fetch everything at once
const { listings } = await getAllListingsByCollection('slug', 1000);

// ✅ Fetch as needed
const { listings, next } = await getBestListingsByCollection('slug', 20);
```

## 🐛 Error Handling

```typescript
// All functions handle errors gracefully
const events = await getEvents({ limit: 50 });
// Returns { asset_events: [], next: null } on error

const listing = await getBestListingByNFT('arbitrum', '0x...', '123');
// Returns null on error

// Always check for null/empty
if (listing) {
  console.log('Listing found:', listing.current_price);
} else {
  console.log('No listing found or error occurred');
}

// Handle pagination safely
const { listings, next } = await getBestListingsByCollection('slug', 50);
if (listings.length > 0) {
  // Process listings
}
if (next) {
  // Load more
}
```

## 📱 React Component Examples

### Simple Events Feed
```tsx
function EventsFeed() {
  const [events, setEvents] = useState<AssetEvent[]>([]);
  
  useEffect(() => {
    getEventsByCollection('boredapeyachtclub', {
      event_type: ['sale'],
      limit: 10
    }).then(res => setEvents(res.asset_events));
  }, []);
  
  return (
    <div>
      {events.map(event => (
        <div key={event.event_timestamp}>
          Sale: {event.nft?.name}
        </div>
      ))}
    </div>
  );
}
```

### Listings Table
```tsx
function ListingsTable() {
  const [listings, setListings] = useState<Listing[]>([]);
  
  useEffect(() => {
    getBestListingsByCollection('boredapeyachtclub', 20)
      .then(res => setListings(res.listings));
  }, []);
  
  return (
    <table>
      <thead>
        <tr>
          <th>Price</th>
          <th>Seller</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        {listings.map(listing => (
          <tr key={listing.order_hash}>
            <td>{listing.current_price}</td>
            <td>{listing.maker.address}</td>
            <td>{listing.order_type}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## 🎨 Pre-Built Components

Use the ready-made components:

```tsx
import { NFTEventsFeed } from '@/components/NFTEventsFeed';
import { NFTListingsPanel } from '@/components/NFTListingsPanel';
import { NFTTraitsDisplay } from '@/components/NFTTraitsDisplay';

function MyPage() {
  return (
    <div>
      <NFTEventsFeed 
        collectionSlug="boredapeyachtclub"
        eventTypes={['sale', 'transfer']}
        limit={20}
      />
      
      <NFTListingsPanel 
        collectionSlug="boredapeyachtclub"
        limit={20}
      />
      
      <NFTTraitsDisplay 
        collectionSlug="boredapeyachtclub"
      />
    </div>
  );
}
```

## 📚 Additional Resources

- Full Documentation: `OPENSEA_API_INTEGRATION_COMPLETE.md`
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
- OpenSea API Docs: https://docs.opensea.io/reference/api-overview

---

**Quick Reference Version:** 1.0
**Last Updated:** October 30, 2025
