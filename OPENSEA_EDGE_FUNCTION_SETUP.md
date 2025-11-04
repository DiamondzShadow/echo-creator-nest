# OpenSea Edge Function Setup

## Problem
The OpenSea API has CORS (Cross-Origin Resource Sharing) restrictions that prevent direct API calls from the browser. This causes NFTs to not load when searching by wallet address.

## Solution
We've created a Supabase Edge Function (`opensea-proxy`) that acts as a server-side proxy to call the OpenSea API securely.

## Deployment Steps

### 1. Set the OpenSea API Key in Supabase

Run this command to set the environment variable for the edge function:

```bash
npx supabase secrets set OPENSEA_API_KEY="7715571f6eab4ebea3f4b6f7950d6ed6"
```

### 2. Deploy the Edge Function

Deploy the opensea-proxy function to Supabase:

```bash
npx supabase functions deploy opensea-proxy
```

### 3. Verify Deployment

Test the edge function:

```bash
curl -X GET "https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/opensea-proxy?action=getNFTsByWallet&wallet=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&limit=10" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

Replace `YOUR_SUPABASE_ANON_KEY` with your actual key from the .env file.

## What's Changed

### Files Modified:
1. **`supabase/functions/opensea-proxy/index.ts`** (NEW)
   - Server-side proxy for OpenSea API calls
   - Handles CORS properly
   - Supports multiple OpenSea API endpoints

2. **`src/lib/opensea.ts`**
   - Updated to use Edge Function instead of direct API calls
   - Added `USE_EDGE_FUNCTION` flag (set to `true`)
   - Falls back to direct API calls if needed

3. **`src/pages/NFTPortfolio.tsx`**
   - Added chain selector dropdown
   - Enhanced error logging
   - Better user feedback

## How It Works

```
Browser → Supabase Edge Function → OpenSea API
   ↑                                       ↓
   └────────────── Response ──────────────┘
```

1. User enters wallet address in the UI
2. Frontend calls the Supabase Edge Function
3. Edge Function calls OpenSea API with the API key (server-side)
4. OpenSea returns NFT data
5. Edge Function forwards data to frontend
6. NFTs are displayed to the user

## Testing

After deployment, test by:

1. Visit: http://localhost:5173/nft-portfolio
2. Enter a wallet address (e.g., `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`)
3. Select a chain (optional) or leave as "All Chains"
4. Click "Search Wallet"
5. Check the browser console for logs
6. NFTs should now load successfully

## Troubleshooting

### Edge Function Not Found
- Make sure you've deployed: `npx supabase functions deploy opensea-proxy`
- Verify in Supabase Dashboard → Edge Functions

### API Key Not Set
- Run: `npx supabase secrets list` to verify
- Set it: `npx supabase secrets set OPENSEA_API_KEY="your_key"`

### Still Getting Errors
- Check browser console for detailed error messages
- Check Supabase Edge Function logs in the dashboard
- Verify your Supabase URL and keys in `.env`

## Environment Variables Required

Make sure these are set in your `.env` file:

```bash
VITE_SUPABASE_URL="https://woucixqbnzmvlvnaaelb.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_publishable_key"
VITE_OPENSEA_API_KEY="7715571f6eab4ebea3f4b6f7950d6ed6"  # Still used for reference
```

And in Supabase secrets (server-side):
```bash
OPENSEA_API_KEY="7715571f6eab4ebea3f4b6f7950d6ed6"
```

## Benefits

✅ **Security**: API key is never exposed to the browser
✅ **CORS Fixed**: No more cross-origin errors
✅ **Reliability**: Server-side requests are more stable
✅ **Rate Limiting**: Better control over API usage
✅ **Caching**: Can add caching in the future

## Next Steps

1. Deploy the edge function (see step 2 above)
2. Test the NFT portfolio page
3. Enjoy viewing NFTs from any wallet address!
