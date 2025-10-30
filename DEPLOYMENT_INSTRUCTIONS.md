# Video Tipping & NFT Marketplace - Deployment Instructions

## ✅ What's Been Implemented

### 1. Smart Contract Integration
- **VideoTipping Contract**: `0x61801bC99d1A8CBb80EBE2b4171c1C6dC1B684f8`
- **NFT Marketplace Contract**: `0x2c4aFDfEB45d2b05A33aDb8B96e8a275b54Ccb16`
- **TipJar Contract**: `0x8B0e8894B16d685A7586A55cb9e76B0fFcEb096c` (already existed)

### 2. Frontend Components
- ✅ `VideoTipButton.tsx` - Video-specific tipping component
- ✅ `VideoWatch.tsx` - Integrated tip button into video page
- ✅ `web3-config.ts` - Added all contract addresses and ABIs
- ✅ `nft-marketplace-abi.ts` - Separate NFT marketplace ABI

### 3. Backend (Supabase)
- ✅ `record-video-tip` Edge Function
- ✅ `video_tips` Table Migration

## 🚀 Deployment Steps for Lovable

Since this is running through **Lovable** and **git**, the deployment is mostly automatic, but here are the steps to ensure everything works:

### Step 1: Verify Git Changes
```bash
# Check current branch
git branch

# View committed changes
git log --oneline -3
```

All changes should already be committed to your branch: `cursor/interact-with-video-tipping-contract-0470`

### Step 2: Database Migration (Supabase)

The migration file has been created at:
```
supabase/migrations/20251030170000_video_tips_table.sql
```

**For Lovable Projects:**
Lovable automatically applies migrations when you push to your branch. The migration will:
- Create `video_tips` table
- Add indexes for performance
- Set up Row Level Security (RLS)
- Create policies for authenticated users

**To manually apply (if needed):**
```bash
# If you have Supabase CLI installed
supabase db push

# Or apply directly in Supabase Dashboard
# SQL Editor > paste migration content > Run
```

### Step 3: Deploy Edge Function

The edge function has been created at:
```
supabase/functions/record-video-tip/index.ts
```

**For Lovable Projects:**
Edge functions are automatically deployed when you push to your branch.

**To manually deploy (if needed):**
```bash
supabase functions deploy record-video-tip
```

### Step 4: Environment Variables

Ensure these environment variables are set in your Supabase project:

```env
VIDEO_TIPPING_CONTRACT_ADDRESS=0x61801bC99d1A8CBb80EBE2b4171c1C6dC1B684f8
NFT_MARKETPLACE_CONTRACT_ADDRESS=0x2c4aFDfEB45d2b05A33aDb8B96e8a275b54Ccb16
```

**Where to set:**
1. Go to Supabase Dashboard
2. Project Settings > Edge Functions > Environment Variables
3. Add the variables above

### Step 5: Frontend Environment Variables

Your frontend already has these in `src/lib/web3-config.ts` as hardcoded values, which is fine for contract addresses (they're public).

## 🧪 Testing the Integration

### Test Video Tipping:

1. **Connect Wallet**
   - Go to any video on your platform
   - Make sure you're signed in
   - Connect your Web3 wallet (MetaMask, etc.)

2. **Creator Must Have Wallet**
   - The video creator must have connected their wallet
   - Their `wallet_address` must be in the `profiles` table

3. **Send a Tip**
   - Click "Tip Video" button on video page
   - Enter amount (e.g., 0.01 ETH)
   - Confirm transaction in wallet
   - Wait for confirmation
   - You should see success message

4. **Verify in Database**
   ```sql
   SELECT * FROM video_tips ORDER BY created_at DESC LIMIT 10;
   ```

### Test on Different Networks:

The contracts support:
- Ethereum Mainnet
- Polygon
- Base
- Arbitrum
- Optimism
- Filecoin Hyperspace (Testnet)

**Recommendation:** Test on a testnet first (like Filecoin Hyperspace or Polygon Mumbai)

## 🔍 Debugging

### If Tips Don't Record:

1. **Check Browser Console**
   ```javascript
   // Should see transaction hash
   console.log('Transaction sent:', hash);
   ```

2. **Check Edge Function Logs**
   - Supabase Dashboard > Edge Functions > record-video-tip > Logs
   - Look for verification errors

3. **Check Transaction on Block Explorer**
   - Copy transaction hash
   - View on Etherscan/Polygonscan
   - Verify it's calling the correct contract

4. **Common Issues:**
   - Creator doesn't have `wallet_address` set
   - User not authenticated
   - Wrong network selected
   - Transaction not yet mined

### Edge Function Not Working:

If the edge function isn't deployed:

```bash
# Check if function exists
supabase functions list

# Deploy manually
supabase functions deploy record-video-tip

# Test locally
supabase functions serve record-video-tip
```

## 📊 Database Queries

### View Video Tips:
```sql
SELECT 
  vt.*,
  v.title as video_title,
  sender.username as from_username,
  receiver.username as to_username
FROM video_tips vt
JOIN assets v ON vt.video_id = v.id
JOIN profiles sender ON vt.from_user_id = sender.id
JOIN profiles receiver ON vt.to_user_id = receiver.id
ORDER BY vt.created_at DESC;
```

### Creator Earnings:
```sql
SELECT 
  p.username,
  p.display_name,
  COUNT(vt.id) as total_video_tips,
  SUM(CAST(vt.amount AS NUMERIC)) as total_amount_wei
FROM profiles p
LEFT JOIN video_tips vt ON p.id = vt.to_user_id
GROUP BY p.id, p.username, p.display_name
HAVING COUNT(vt.id) > 0
ORDER BY total_amount_wei DESC;
```

## 🎯 Next Steps

### 1. Build NFT Marketplace UI
Create components for:
- Listing NFTs for sale
- Browsing NFT marketplace
- Buying NFTs
- Managing listings

### 2. Add Analytics Dashboard
Show creators:
- Total tips received per video
- Top tipped videos
- Earnings over time
- Tip breakdown (platform fee, custom fee, earnings)

### 3. Custom Fee Management
Allow creators to:
- Set custom fee percentages per video
- View fee structures
- Update tip settings

### 4. Notifications
Add notifications for:
- Received tips
- Successful transactions
- Failed transactions

## 🔒 Security Notes

- ✅ Transaction verification on blockchain
- ✅ Duplicate prevention (transaction hash check)
- ✅ RLS policies on database tables
- ✅ Authentication required for all operations
- ✅ Service role used only for verified insertions

## 📱 Frontend Features

### VideoTipButton Component:
- ✅ Wallet connection check
- ✅ Creator wallet verification
- ✅ Amount validation
- ✅ Transaction confirmation UI
- ✅ Loading states
- ✅ Error handling
- ✅ Success notifications
- ✅ Network display

## 🎨 UI/UX

The tip button appears:
- On video watch page
- Next to creator profile button
- Only when creator has wallet connected
- With clean, modern dialog
- Mobile responsive

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Verify wallet is connected to correct network
3. Check Supabase Edge Function logs
4. Ensure migrations have been applied
5. Verify environment variables are set

## ✨ Additional Features to Consider

1. **Tip Leaderboards** - Show top tippers and creators
2. **Tip Goals** - Allow creators to set funding goals
3. **Recurring Tips** - Monthly subscriptions via smart contracts
4. **Tip Multipliers** - Special events with bonus tips
5. **NFT Rewards** - Mint NFTs for top supporters

## 🎉 You're Ready!

Everything is implemented and ready to go. The system will work automatically once:
1. Migrations are applied (automatic in Lovable)
2. Edge functions are deployed (automatic in Lovable)
3. Users connect their wallets
4. Creators set their wallet addresses

Happy tipping! 🚀
