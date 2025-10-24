# FVM YouTube Clone Setup Guide

This guide will help you set up and deploy the decentralized YouTube clone built on Filecoin Virtual Machine (FVM).

## Overview

The FVM YouTube Clone is a decentralized video platform that leverages:

- **FVM (Filecoin Virtual Machine)** - Smart contracts on Filecoin blockchain
- **IPFS via Lighthouse** - Decentralized storage for videos and thumbnails
- **Web3 Wallet** - MetaMask integration for blockchain interactions
- **Permanent Storage** - Videos stored on Filecoin with guaranteed retrieval

## Prerequisites

- Node.js v16 or later
- MetaMask browser extension
- Basic understanding of Solidity and React
- Test FIL tokens (from Hyperspace faucet)

## Step 1: Install Required Dependencies

```bash
npm install @lighthouse-web3/sdk ethers
```

## Step 2: Deploy Smart Contract

### Using Remix IDE (Recommended)

1. Go to [remix.ethereum.org](https://remix.ethereum.org)
2. Create a new workspace
3. Copy the contract from `contracts/YouTube.sol` into the editor
4. Compile the contract (Solidity ^0.8.0)

### Add Filecoin Hyperspace Testnet to MetaMask

Add the following network to MetaMask:

- **Network Name**: Filecoin Hyperspace
- **RPC URL**: `https://api.hyperspace.node.glif.io/rpc/v1`
- **Chain ID**: `3141`
- **Currency Symbol**: `tFIL`
- **Block Explorer**: `https://hyperspace.filscan.io/`

### Get Test FIL

Visit the Hyperspace faucet to get test FIL: https://hyperspace.yoga/#faucet

### Deploy Contract

1. In Remix, switch to the "Deploy & Run Transactions" tab
2. Select "Injected Provider - MetaMask" as the environment
3. Make sure MetaMask is connected to Hyperspace testnet
4. Click "Deploy"
5. Confirm the transaction in MetaMask
6. **Copy your deployed contract address** - you'll need this later

### Download Contract Artifacts

1. In Remix, click on the file explorer icon
2. Navigate to `contracts/artifacts/contracts/YouTube.sol/`
3. Download the `YouTube.json` file
4. The ABI is already included in `src/lib/fvm-config.ts`, but you can verify it matches

## Step 3: Get Lighthouse API Key

Lighthouse is used for IPFS storage of videos and thumbnails.

1. Go to [https://files.lighthouse.storage](https://files.lighthouse.storage)
2. Sign up for a free account
3. Navigate to the API Key page
4. Click "Create API Key"
5. Give it a name (e.g., "FVM YouTube")
6. **Copy the generated API key** - you'll need this for environment variables

## Step 4: Configure Environment Variables

Create or update your `.env` file in the root directory:

```bash
# FVM Contract Address (from Step 2)
VITE_FVM_CONTRACT_ADDRESS=your_deployed_contract_address_here

# Lighthouse API Key (from Step 3)
VITE_LIGHTHOUSE_API_KEY=your_lighthouse_api_key_here
```

Example:
```bash
VITE_FVM_CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
VITE_LIGHTHOUSE_API_KEY=7a8b9c0d-1e2f-3g4h-5i6j-7k8l9m0n1o2p
```

## Step 5: Update Contract Address in Code

The contract address is already configured to use the environment variable in `src/lib/fvm-config.ts`:

```typescript
export const YOUTUBE_CONTRACT_ADDRESS = import.meta.env.VITE_FVM_CONTRACT_ADDRESS || "0x...";
```

Just make sure your `.env` file has the correct address.

## Step 6: Start the Application

```bash
npm run dev
```

Navigate to `http://localhost:5173/fvm` to access the FVM YouTube Clone.

## Using the Application

### Connecting Your Wallet

1. Click "Connect Wallet" in the top navigation
2. Select MetaMask
3. Approve the connection
4. Make sure you're on the Hyperspace testnet

### Uploading Videos

1. Navigate to the "Upload Video" tab
2. Fill in the video details:
   - Title (required)
   - Description
   - Location
   - Category (required)
   - Thumbnail image (required)
   - Video file (required)
3. Click "Upload to Blockchain"
4. Wait for the files to upload to IPFS via Lighthouse
5. Confirm the blockchain transaction in MetaMask
6. Wait for the transaction to be confirmed

### Browsing Videos

1. Navigate to the "Browse Videos" tab
2. Use the search bar to find specific videos
3. Filter by category using the dropdown
4. Click on any video card to watch it

### Watching Videos

1. Click on a video from the browse page
2. The video will play from IPFS
3. View video details, description, and metadata
4. See the IPFS hashes and blockchain information

## Architecture

### Smart Contract (`contracts/YouTube.sol`)

- Stores video metadata on-chain
- Maintains video count
- Emits events for video uploads
- Maps video IDs to video data

### Frontend Components

- **FVMUpload** - Upload interface for videos
- **FVMVideoList** - Browse and search videos
- **FVMVideoPlayer** - Video player with metadata
- **FVMVideoCard** - Reusable video card component

### IPFS Storage

- Videos and thumbnails are stored on IPFS via Lighthouse
- IPFS hashes are stored in the smart contract
- Multiple gateway options for resilience

## Troubleshooting

### "Please install MetaMask" error

Make sure MetaMask browser extension is installed and enabled.

### "Lighthouse API key not found" error

Check that your `.env` file has `VITE_LIGHTHOUSE_API_KEY` set correctly.

### "Contract not deployed" error

Verify that:
1. Your contract is deployed to Hyperspace testnet
2. The contract address in `.env` is correct
3. You're connected to the correct network in MetaMask

### Videos not loading

- Check IPFS gateway availability
- Try refreshing the page
- Verify the IPFS hash in the smart contract

### Transaction fails

- Make sure you have enough test FIL in your wallet
- Check gas settings in MetaMask
- Verify network connection

## Testing Network Information

### Filecoin Hyperspace Testnet

- **Purpose**: Testing smart contracts before mainnet deployment
- **Chain ID**: 3141
- **RPC**: https://api.hyperspace.node.glif.io/rpc/v1
- **Faucet**: https://hyperspace.yoga/#faucet
- **Explorer**: https://hyperspace.filscan.io

## Security Considerations

1. **Private Keys**: Never commit private keys or mnemonics
2. **API Keys**: Keep Lighthouse API keys secure
3. **Testnet Only**: Start with testnet before mainnet
4. **Content Moderation**: Implement content moderation for production
5. **Rate Limiting**: Add rate limiting for uploads

## Production Deployment

For production deployment on Filecoin mainnet:

1. Deploy contract to Filecoin mainnet
2. Update contract address in environment variables
3. Get FIL tokens for transactions
4. Implement content moderation
5. Add user authentication
6. Implement access controls
7. Add video transcoding/optimization
8. Set up CDN for faster delivery
9. Monitor contract interactions
10. Implement backup strategies

## Additional Resources

- [FVM Documentation](https://docs.filecoin.io/smart-contracts/fundamentals/the-fvm)
- [Lighthouse Documentation](https://docs.lighthouse.storage/)
- [Remix IDE](https://remix.ethereum.org/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [Filecoin Documentation](https://docs.filecoin.io/)

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure MetaMask is on the correct network
4. Check that you have test FIL in your wallet
5. Review the contract deployment on the block explorer

## License

This project is for educational purposes. Use at your own risk.
