# Why Your NFTs Aren't Loading & How to Fix It 🔧

## The Problem

Your NFTs aren't populating because the **OpenSea API blocks direct browser requests** (CORS policy). When you try to fetch NFTs from your wallet address, the browser gets blocked by OpenSea's security.

### What is CORS?
CORS (Cross-Origin Resource Sharing) is a security feature that prevents websites from making API calls to other domains directly from the browser. OpenSea requires API keys to be used server-side to keep them secure.

## The Solution

I've created a **Supabase Edge Function** that acts as a secure proxy between your frontend and OpenSea's API. 

### Here's how it works:

```
Browser Request
    ↓
Supabase Edge Function (Server-Side)
    ↓
OpenSea API (with secure API key)
    ↓
Returns NFT Data
    ↓
Displays in Your App
```

## Quick Fix Options

### Option 1: Try Direct API Calls First (Current Setting)

The code is currently set to try direct API calls. This might work in some browsers or with certain configurations.

**To test:**
1. Go to http://localhost:5173/nft-portfolio
2. Enter your wallet address
3. Click "Search Wallet"
4. Open browser console (F12) and check for errors

**If you see CORS errors in console:**
- Error messages like "blocked by CORS policy"
- Error messages about "Access-Control-Allow-Origin"

Then you need Option 2.

### Option 2: Deploy Edge Function (Recommended)

This is the proper, production-ready solution.

#### Step 1: Login to Supabase CLI

```bash
npx supabase login
```

This will open a browser window. Log in with your Supabase account.

#### Step 2: Run the Deployment Script

```bash
./deploy-opensea-function.sh
```

Or manually:

```bash
# Set the API key
npx supabase secrets set OPENSEA_API_KEY="7715571f6eab4ebea3f4b6f7950d6ed6" --project-ref woucixqbnzmvlvnaaelb

# Deploy the function
npx supabase functions deploy opensea-proxy --project-ref woucixqbnzmvlvnaaelb
```

#### Step 3: Enable Edge Function in Code

Edit `src/lib/opensea.ts` and change:

```typescript
const USE_EDGE_FUNCTION = false;  // Change this
```

To:

```typescript
const USE_EDGE_FUNCTION = true;   // Use edge function
```

#### Step 4: Restart Dev Server

```bash
# Stop your current dev server (Ctrl+C)
# Then restart
npm run dev
```

#### Step 5: Test

Go to http://localhost:5173/nft-portfolio and search for your wallet!

## What I've Changed

### 1. Created Edge Function
**File:** `supabase/functions/opensea-proxy/index.ts`

A server-side function that:
- Accepts wallet address, chain, and other parameters
- Calls OpenSea API with your API key securely
- Returns NFT data to your frontend
- Handles CORS properly

### 2. Updated OpenSea Library
**File:** `src/lib/opensea.ts`

- Added toggle for Edge Function vs Direct API calls
- Improved error logging
- Better error messages
- Imported Supabase client for edge function calls

### 3. Enhanced NFT Portfolio Page
**File:** `src/pages/NFTPortfolio.tsx`

- Added chain selector dropdown (Ethereum, Polygon, Arbitrum, etc.)
- Better error messages
- Console logging for debugging
- Improved loading states

## Testing Your Setup

### Test with a Known Wallet

Try this popular wallet that definitely has NFTs:

```
0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

### What You Should See

**In Browser Console (F12 → Console):**
```
Loading NFTs for wallet: 0x... on chain: all
Fetching NFTs from OpenSea: https://api.opensea.io/...
OpenSea API response status: 200
OpenSea API response data: {nfts: [...]}
```

**On Screen:**
- Loading spinner
- Toast notification: "NFTs Loaded - Found X NFTs"
- Grid of NFT images
- Collection stats

### If You See Errors

**CORS Error:**
```
Access to fetch at 'https://api.opensea.io/...' has been blocked by CORS policy
```
**Solution:** Deploy the Edge Function (Option 2 above)

**401/403 Error:**
```
OpenSea API error: 401 - Unauthorized
```
**Solution:** API key is wrong or not set correctly

**404 Error:**
```
Edge Function error: 404
```
**Solution:** Edge function not deployed yet

**No NFTs Found (but you know you have some):**
- Try selecting a specific chain (Ethereum, Polygon, etc.)
- Make sure wallet address is correct (starts with 0x)
- Check if NFTs are on a supported chain

## Supported Blockchains

The OpenSea integration works with:
- ✅ Ethereum
- ✅ Polygon (Matic)
- ✅ Arbitrum
- ✅ Optimism
- ✅ Base
- ✅ Avalanche
- ✅ BSC (Binance Smart Chain)
- ✅ Solana
- ✅ Zora

## Environment Variables Checklist

### In `.env` file:
```bash
✅ VITE_SUPABASE_URL="https://woucixqbnzmvlvnaaelb.supabase.co"
✅ VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGci..."
✅ VITE_OPENSEA_API_KEY="7715571f6eab4ebea3f4b6f7950d6ed6"
```

### In Supabase Secrets (after deployment):
```bash
✅ OPENSEA_API_KEY="7715571f6eab4ebea3f4b6f7950d6ed6"
```

To verify Supabase secrets:
```bash
npx supabase secrets list --project-ref woucixqbnzmvlvnaaelb
```

## Troubleshooting Commands

### Check if Edge Function is Deployed
```bash
npx supabase functions list --project-ref woucixqbnzmvlvnaaelb
```

### View Edge Function Logs
```bash
npx supabase functions logs opensea-proxy --project-ref woucixqbnzmvlvnaaelb
```

### Test Edge Function Directly
```bash
curl "https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/opensea-proxy?action=getNFTsByWallet&wallet=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&limit=5" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

## Still Having Issues?

1. **Check Browser Console** - Look for specific error messages
2. **Check Supabase Dashboard** - Go to Edge Functions → opensea-proxy → Logs
3. **Verify API Key** - Make sure the OpenSea API key is valid
4. **Try Different Wallet** - Use the test wallet address above
5. **Check Chain** - Some wallets have NFTs on specific chains only

## Summary

**The issue:** CORS blocks direct OpenSea API calls from browser

**The fix:** Use Supabase Edge Function as a secure proxy

**To deploy:**
1. `npx supabase login`
2. `./deploy-opensea-function.sh`
3. Set `USE_EDGE_FUNCTION = true` in code
4. Restart dev server
5. Test at `/nft-portfolio`

**Your API Key:** `7715571f6eab4ebea3f4b6f7950d6ed6` ✅ (Already configured)

---

Once deployed, you'll be able to view NFTs from any wallet address across all supported blockchains! 🎨✨
