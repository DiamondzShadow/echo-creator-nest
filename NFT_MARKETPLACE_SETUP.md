# NFT Marketplace & Custom Tipping Setup Guide

This guide will help you deploy and configure the NFT Marketplace with custom video tipping functionality for your CreatorHub platform.

## 🎯 Overview

The system includes three main smart contracts:

1. **CreatorNFT.sol** - ERC721 contract for minting NFTs with royalties
2. **NFTMarketplace.sol** - Marketplace for buying/selling NFTs with platform fees
3. **VideoTipping.sol** - Enhanced tipping with custom per-video fees

## 📋 Prerequisites

- Node.js v18 or higher
- Hardhat or Foundry for contract deployment
- MetaMask or similar Web3 wallet
- ETH for gas fees (on mainnet) or test ETH (on testnets)
- Access to your platform wallet address

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install --save-dev hardhat @openzeppelin/contracts ethers
```

### Step 2: Set Up Hardhat

Create a `hardhat.config.js` file:

```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Ethereum Mainnet
    mainnet: {
      url: process.env.MAINNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    // Polygon
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [process.env.PRIVATE_KEY],
    },
    // Arbitrum
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY],
    },
    // Base
    base: {
      url: "https://mainnet.base.org",
      accounts: [process.env.PRIVATE_KEY],
    },
    // Sepolia Testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      arbitrumOne: process.env.ARBISCAN_API_KEY,
      base: process.env.BASESCAN_API_KEY,
    },
  },
};
```

### Step 3: Deploy Contracts

#### 1. Deploy CreatorNFT Contract

Create `scripts/deploy-creator-nft.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const platformWallet = "YOUR_PLATFORM_WALLET_ADDRESS"; // Replace with your wallet
  
  console.log("Deploying CreatorNFT...");
  const CreatorNFT = await hre.ethers.getContractFactory("CreatorNFT");
  const creatorNFT = await CreatorNFT.deploy(platformWallet);
  
  await creatorNFT.waitForDeployment();
  const address = await creatorNFT.getAddress();
  
  console.log("CreatorNFT deployed to:", address);
  console.log("Platform Wallet:", platformWallet);
  
  // Wait for block confirmations
  console.log("Waiting for block confirmations...");
  await creatorNFT.deploymentTransaction().wait(5);
  
  // Verify on Etherscan
  console.log("Verifying contract on Etherscan...");
  await hre.run("verify:verify", {
    address: address,
    constructorArguments: [platformWallet],
  });
  
  console.log("✅ CreatorNFT deployed and verified!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Deploy:
```bash
npx hardhat run scripts/deploy-creator-nft.js --network sepolia
```

#### 2. Deploy NFTMarketplace Contract

Create `scripts/deploy-nft-marketplace.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const platformWallet = "YOUR_PLATFORM_WALLET_ADDRESS"; // Replace with your wallet
  
  console.log("Deploying NFTMarketplace...");
  const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
  const marketplace = await NFTMarketplace.deploy(platformWallet);
  
  await marketplace.waitForDeployment();
  const address = await marketplace.getAddress();
  
  console.log("NFTMarketplace deployed to:", address);
  console.log("Platform Wallet:", platformWallet);
  
  // Wait for block confirmations
  console.log("Waiting for block confirmations...");
  await marketplace.deploymentTransaction().wait(5);
  
  // Verify on Etherscan
  console.log("Verifying contract on Etherscan...");
  await hre.run("verify:verify", {
    address: address,
    constructorArguments: [platformWallet],
  });
  
  console.log("✅ NFTMarketplace deployed and verified!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Deploy:
```bash
npx hardhat run scripts/deploy-nft-marketplace.js --network sepolia
```

#### 3. Deploy VideoTipping Contract

Create `scripts/deploy-video-tipping.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const platformWallet = "YOUR_PLATFORM_WALLET_ADDRESS"; // Replace with your wallet
  
  console.log("Deploying VideoTipping...");
  const VideoTipping = await hre.ethers.getContractFactory("VideoTipping");
  const videoTipping = await VideoTipping.deploy(platformWallet);
  
  await videoTipping.waitForDeployment();
  const address = await videoTipping.getAddress();
  
  console.log("VideoTipping deployed to:", address);
  console.log("Platform Wallet:", platformWallet);
  
  // Wait for block confirmations
  console.log("Waiting for block confirmations...");
  await videoTipping.deploymentTransaction().wait(5);
  
  // Verify on Etherscan
  console.log("Verifying contract on Etherscan...");
  await hre.run("verify:verify", {
    address: address,
    constructorArguments: [platformWallet],
  });
  
  console.log("✅ VideoTipping deployed and verified!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Deploy:
```bash
npx hardhat run scripts/deploy-video-tipping.js --network sepolia
```

### Step 4: Update Configuration

Update `src/lib/web3-config.ts` with your deployed contract addresses:

```typescript
// Replace these with your deployed contract addresses
export const CREATOR_NFT_CONTRACT_ADDRESS = "0x..."; // CreatorNFT address
export const NFT_MARKETPLACE_CONTRACT_ADDRESS = "0x..."; // NFTMarketplace address
export const VIDEO_TIPPING_CONTRACT_ADDRESS = "0x..."; // VideoTipping address
```

### Step 5: Run Database Migrations

Apply the new database migrations:

```bash
# If using Supabase CLI
supabase db push

# Or apply migrations manually through Supabase dashboard
# Navigate to: Database > Migrations
# Apply these migrations in order:
# 1. 20251030180000_create_nft_listings.sql
# 2. 20251030180100_create_video_tip_settings.sql
# 3. 20251030180200_create_nft_transactions.sql
```

### Step 6: Add NFT Marketplace Route

Update your routing configuration to include the NFT Marketplace page.

In `src/App.tsx` or your router configuration:

```typescript
import NFTMarketplace from '@/pages/NFTMarketplace';

// Add this route
<Route path="/marketplace" element={<NFTMarketplace />} />
```

Update `src/components/Navbar.tsx` to add a marketplace link:

```typescript
<Link to="/marketplace">NFT Marketplace</Link>
```

## 🎨 Features

### NFT Minting
- **Minting Fee**: 0.001 ETH
- **Custom Royalties**: 0-30% on all future sales
- **Metadata**: Stored on IPFS
- **Ownership**: Full ERC721 compliance

### NFT Marketplace
- **Platform Fee**: 2.5% on all sales
- **Royalty Support**: Automatic royalty payments to original creators
- **Payment Options**: Native currency (ETH/MATIC) and ERC20 tokens
- **Listing Management**: Create, update, and cancel listings

### Custom Video Tipping
- **Base Platform Fee**: 3%
- **Custom Creator Fee**: 0-50% additional fee per video
- **Transparent Breakdown**: Tippers see fee breakdown before sending
- **Multiple Payment Methods**: Native currency and ERC20 tokens

## 🔧 Usage Examples

### Minting an NFT

```typescript
import { useWriteContract } from 'wagmi';
import { CREATOR_NFT_CONTRACT_ADDRESS, CREATOR_NFT_ABI } from '@/lib/web3-config';

const { writeContract } = useWriteContract();

// Mint NFT with 10% royalty
writeContract({
  address: CREATOR_NFT_CONTRACT_ADDRESS,
  abi: CREATOR_NFT_ABI,
  functionName: 'mintNFT',
  args: [walletAddress, metadataUri, 1000], // 1000 = 10%
  value: parseEther('0.001'), // Minting fee
});
```

### Listing an NFT

```typescript
import { useWriteContract } from 'wagmi';
import { NFT_MARKETPLACE_CONTRACT_ADDRESS, NFT_MARKETPLACE_ABI } from '@/lib/web3-config';

const { writeContract } = useWriteContract();

// First, approve the marketplace to transfer the NFT
await writeContract({
  address: CREATOR_NFT_CONTRACT_ADDRESS,
  abi: CREATOR_NFT_ABI,
  functionName: 'approve',
  args: [NFT_MARKETPLACE_CONTRACT_ADDRESS, tokenId],
});

// Then list the NFT
await writeContract({
  address: NFT_MARKETPLACE_CONTRACT_ADDRESS,
  abi: NFT_MARKETPLACE_ABI,
  functionName: 'listNFT',
  args: [
    CREATOR_NFT_CONTRACT_ADDRESS,
    tokenId,
    parseEther('0.1'), // Price
    '0x0000000000000000000000000000000000000000', // address(0) for ETH
  ],
});
```

### Setting Custom Video Tip Fee

```typescript
import { useWriteContract } from 'wagmi';
import { VIDEO_TIPPING_CONTRACT_ADDRESS, VIDEO_TIPPING_ABI } from '@/lib/web3-config';

const { writeContract } = useWriteContract();

// Set 5% custom fee for a video
writeContract({
  address: VIDEO_TIPPING_CONTRACT_ADDRESS,
  abi: VIDEO_TIPPING_ABI,
  functionName: 'setVideoTipSettings',
  args: [videoId, 500], // 500 = 5%
});
```

### Tipping a Video with Custom Fee

```typescript
import { useWriteContract } from 'wagmi';
import { VIDEO_TIPPING_CONTRACT_ADDRESS, VIDEO_TIPPING_ABI } from '@/lib/web3-config';

const { writeContract } = useWriteContract();

// Tip video with custom fee
writeContract({
  address: VIDEO_TIPPING_CONTRACT_ADDRESS,
  abi: VIDEO_TIPPING_ABI,
  functionName: 'tipVideoWithNative',
  args: [videoId, creatorAddress],
  value: parseEther('0.1'), // Tip amount
});
```

## 🔐 Security Considerations

1. **Contract Ownership**: Transfer ownership to a multi-sig wallet for production
2. **Fee Updates**: Only owner can update platform fees
3. **Emergency Functions**: Test emergency withdrawal functions
4. **Reentrancy Protection**: All contracts use ReentrancyGuard
5. **Pausable**: Contracts can be paused in case of emergency

## 📊 Fee Structure

### NFT Minting
- **Minting Fee**: 0.001 ETH (goes to platform)
- **Gas Fee**: Variable (paid by minter)

### NFT Sales
- **Platform Fee**: 2.5% of sale price
- **Creator Royalty**: 0-30% (set by original creator)
- **Seller Amount**: Sale price - platform fee - royalty

### Video Tipping
- **Platform Fee**: 3% of tip amount
- **Custom Creator Fee**: 0-50% of tip amount (optional)
- **Creator Receives**: Tip amount - platform fee + custom fee

## 🧪 Testing

### Test on Sepolia Testnet

1. Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
2. Deploy contracts to Sepolia
3. Test all functions thoroughly
4. Monitor gas costs and optimize

### Recommended Tests

- [ ] Mint NFT with various royalty percentages
- [ ] List NFT on marketplace
- [ ] Buy NFT and verify royalty payment
- [ ] Cancel listing
- [ ] Update listing price
- [ ] Set video tip settings (various percentages)
- [ ] Tip video with and without custom fee
- [ ] Test emergency functions
- [ ] Test pause/unpause functionality

## 📈 Analytics & Monitoring

Track important metrics in your database:

1. **NFT Metrics**
   - Total NFTs minted
   - Total marketplace volume
   - Platform fees collected
   - Average NFT price

2. **Tipping Metrics**
   - Total tips per video
   - Custom fee usage
   - Creator earnings
   - Platform fee revenue

Query example:

```sql
-- Get NFT marketplace stats
SELECT 
  COUNT(*) as total_listings,
  SUM(price) as total_volume,
  AVG(price) as avg_price
FROM nft_listings
WHERE status = 'sold';

-- Get video tip stats
SELECT 
  video_id,
  custom_fee_percentage,
  total_tips_received,
  total_amount_received
FROM video_tip_settings
ORDER BY total_amount_received DESC
LIMIT 10;
```

## 🎯 Next Steps

1. **IPFS Integration**: Set up IPFS pinning service for NFT metadata
2. **Metadata Enhancement**: Add more NFT attributes and properties
3. **Collection Support**: Create NFT collections
4. **Auction System**: Add time-based auctions
5. **Batch Minting**: Allow minting multiple NFTs at once
6. **Lazy Minting**: Mint NFTs only when purchased
7. **Advanced Filtering**: Add category, price range, and attribute filters
8. **Offer System**: Allow buyers to make offers below listing price

## 🆘 Troubleshooting

### Common Issues

**Contract Not Found Error**
- Verify contract addresses in `web3-config.ts`
- Check you're on the correct network

**Transaction Failed**
- Ensure sufficient gas and ETH balance
- Check contract is not paused
- Verify approvals are set correctly

**Metadata Not Loading**
- Confirm IPFS gateway is accessible
- Check metadata URI format
- Verify JSON structure

**Tips Not Recording**
- Ensure video_id matches between contract and database
- Check supabase edge function logs
- Verify transaction was confirmed on-chain

## 📞 Support

For issues or questions:
- Check contract events on block explorer
- Review transaction logs
- Test on testnet first
- Consult OpenZeppelin documentation

## 🎉 Success!

Your NFT Marketplace with custom video tipping is now set up! Users can:

✅ Mint NFTs with custom royalties
✅ Buy and sell NFTs on the marketplace
✅ Set custom tip fees on videos
✅ Earn from both NFT sales and video tips

Happy building! 🚀
