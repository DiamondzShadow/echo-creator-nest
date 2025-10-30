# Web3 Contracts Integration Summary

## Overview
Successfully integrated three blockchain contracts into CrabbyTV platform:
1. **TipJar Contract** - General creator tipping
2. **VideoTipping Contract** - Video-specific tipping with custom fees
3. **NFT Marketplace Contract** - NFT listings and sales

## Contract Addresses

### TipJar Contract (General Tips)
- **Address**: `0x8B0e8894B16d685A7586A55cb9e76B0fFcEb096c`
- **Purpose**: Handles general creator tips with 3% platform fee
- **Location**: `src/lib/web3-config.ts`

### VideoTipping Contract (Video Tips)
- **Address**: `0x61801bC99d1A8CBb80EBE2b4171c1C6dC1B684f8`
- **Purpose**: Handles video-specific tips with customizable fees per video
- **Location**: `src/lib/web3-config.ts`
- **Features**:
  - Platform fee (default 3%)
  - Custom fee per video set by creators
  - Video-specific tip tracking
  - On-chain fee calculation

### NFT Marketplace Contract
- **Address**: `0x2c4aFDfEB45d2b05A33aDb8B96e8a275b54Ccb16`
- **Purpose**: Handles NFT listings, sales, and marketplace functionality
- **Location**: `src/lib/nft-marketplace-abi.ts`
- **Features**:
  - List NFTs with custom prices
  - Buy NFTs with automatic fee distribution
  - Platform fee management
  - Royalty support
  - Listing expiration and extension
  - Trusted NFT contract whitelist

## Platform Wallet
- **Address**: `0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363`
- **Purpose**: Receives platform fees from all contracts

## Components Created

### VideoTipButton Component
**File**: `src/components/VideoTipButton.tsx`

A specialized component for tipping creators on specific videos:
- Uses VideoTipping contract
- Accepts video ID and creator information
- Handles both native ETH and ERC-20 token tips
- Automatic fee calculation on-chain
- Transaction confirmation and recording
- Integration with Supabase for tip history

**Props**:
```typescript
interface VideoTipButtonProps {
  videoId: string;              // Video asset ID
  creatorUserId: string;         // Creator's user ID
  creatorWalletAddress?: string; // Creator's wallet address
  creatorUsername: string;       // Display name
}
```

**Usage**:
```tsx
<VideoTipButton
  videoId={asset.id}
  creatorUserId={asset.user_id}
  creatorWalletAddress={asset.profiles?.wallet_address}
  creatorUsername={asset.profiles?.username || 'Creator'}
/>
```

## Integration Points

### VideoWatch Page
**File**: `src/pages/VideoWatch.tsx`

Added VideoTipButton next to the "View Profile" button in the creator info section:
- Fetches creator wallet address from profiles
- Displays tip button for each video
- Seamless integration with existing UI

### TipButton Component
**File**: `src/components/TipButton.tsx`

Existing general tipping component that uses TipJar contract:
- Profile-level tipping
- Not video-specific
- Simpler fee structure (fixed 3%)

## Configuration Files

### Web3 Config
**File**: `src/lib/web3-config.ts`

Contains:
- Contract addresses
- TipJar ABI
- VideoTipping ABI
- Platform wallet address
- Rainbow Kit configuration
- Chain configurations (Mainnet, Polygon, Base, Arbitrum, Optimism, Filecoin Hyperspace)

### NFT Marketplace ABI
**File**: `src/lib/nft-marketplace-abi.ts`

Separate file for NFT Marketplace ABI due to size considerations.

## Smart Contract Functions

### VideoTipping Contract Key Functions

#### Write Functions
- `tipVideoWithNative(videoId, creator)` - Tip with native currency (ETH)
- `tipVideoWithToken(videoId, creator, token, amount)` - Tip with ERC-20 token
- `setVideoTipSettings(videoId, customFeePercentage)` - Set custom fee for video (creator only)

#### Read Functions
- `calculateTipBreakdown(videoId, amount)` - Preview fee breakdown
- `getVideoTipSettings(videoId)` - Get custom settings for video
- `totalVolume()` - Total platform volume
- `totalTips()` - Total number of tips
- `creatorEarnings(address)` - Creator's total earnings

### NFT Marketplace Contract Key Functions

#### Write Functions
- `listNFT(nftContract, tokenId, price, paymentToken, duration)` - List NFT for sale
- `buyNFT(listingId)` - Purchase listed NFT
- `cancelListing(listingId)` - Cancel listing
- `updatePrice(listingId, newPrice)` - Update listing price
- `extendListing(listingId, additionalDuration)` - Extend listing duration

#### Read Functions
- `getListing(listingId)` - Get listing details
- `calculateSaleBreakdown(listingId)` - Preview sale fees
- `isNFTContractTrusted(address)` - Check if NFT contract is whitelisted
- `totalVolume()` - Total marketplace volume
- `totalSales()` - Total number of sales

## Database Integration

### Required Edge Function
**Function**: `record-video-tip`

Should be created in `supabase/functions/record-video-tip/index.ts`:
```typescript
// Records video tips in database
// Verifies transaction on-chain
// Links tip to video and creator
// Updates creator earnings
```

### Database Tables
Likely needs:
- `video_tips` - Record of all video tips
- `creator_earnings` - Aggregated earnings per creator
- Profile updates to include `wallet_address` field

## Network Support
All contracts support:
- Ethereum Mainnet
- Polygon
- Base
- Arbitrum
- Optimism
- Filecoin Hyperspace (Testnet)

## Features Enabled

### Video Tipping
✅ Tip creators on specific videos
✅ Custom fee structures per video
✅ On-chain fee calculation
✅ Multi-chain support
✅ Transaction history
✅ Creator earnings tracking

### NFT Marketplace
✅ List NFTs for sale
✅ Buy NFTs with crypto
✅ Automatic fee distribution
✅ Royalty support
✅ Listing management
✅ Trusted contract whitelist

### General Tipping
✅ Profile-level tipping
✅ Platform fee (3%)
✅ Multiple token support

## Next Steps

1. **Create Edge Function**: Implement `record-video-tip` function in Supabase
2. **Database Schema**: Add `video_tips` table if not exists
3. **Testing**: Test tipping functionality on testnet
4. **NFT Integration**: Build UI for NFT marketplace functionality
5. **Analytics**: Add dashboard for creator earnings and platform stats
6. **Documentation**: Create user guides for tipping and NFT features

## Security Considerations

- All contracts use OpenZeppelin libraries
- Reentrancy guards on all state-changing functions
- Pausable functionality for emergencies
- Owner-only admin functions
- ERC-721 receiver for safe NFT transfers
- SafeERC20 for token transfers

## Gas Optimization

- Efficient storage patterns
- Minimal state changes
- Batch operations where possible
- View functions for calculations

## Error Handling

All components include:
- Wallet connection checks
- Transaction confirmation waiting
- Error toast notifications
- Loading states
- Transaction failure recovery

## UI/UX Features

- Clean, intuitive tipping dialogs
- Real-time transaction status
- Network display
- Amount validation
- Fee breakdown previews
- Success notifications
- Mobile-responsive design

## Maintenance Notes

- Keep ABIs in sync with deployed contracts
- Update contract addresses if redeployed
- Monitor gas costs and optimize if needed
- Regular security audits recommended
- Keep dependencies updated
