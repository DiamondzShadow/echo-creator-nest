# YouTube Smart Contract for FVM

This directory contains the Solidity smart contract for the decentralized YouTube clone built on FVM (Filecoin Virtual Machine).

## Contract: YouTube.sol

A decentralized video sharing platform that stores video metadata on-chain while actual video files are stored on IPFS.

### Features

- Upload video metadata to blockchain
- Store video hash, title, description, location, category, and thumbnail hash
- Track video count and authors
- Emit events for video uploads

### Deployment Instructions

1. **Using Remix IDE** (Recommended for quick deployment):
   - Go to [remix.ethereum.org](https://remix.ethereum.org)
   - Create a new workspace
   - Copy `YouTube.sol` into the editor
   - Switch to the Deploy tab
   - Add Hyperspace testnet to your Metamask:
     - Network Name: Filecoin Hyperspace
     - RPC URL: https://api.hyperspace.node.glif.io/rpc/v1
     - Chain ID: 3141
     - Currency Symbol: tFIL
     - Block Explorer: https://hyperspace.filscan.io/
   - Select your network from the Environment tab
   - Deploy the contract
   - Copy the contract address

2. **After Deployment**:
   - Save your contract address
   - Download the artifacts folder from Remix (backup icon -> .workspace directory)
   - Copy the ABI from the artifacts to use in your frontend
   - Update the contract address in `src/lib/fvm-config.ts`

### Contract Structure

```solidity
struct Video {
    uint256 id;
    string hash;          // IPFS hash of the video
    string title;
    string description;
    string location;
    string category;
    string thumbnailHash; // IPFS hash of the thumbnail
    string date;
    address author;
}
```

### Functions

- `uploadVideo()`: Upload a new video to the platform
- `videos()`: Get video details by ID
- `videoCount`: Get the total number of videos

### Events

- `VideoUploaded`: Emitted when a new video is uploaded

### Testing Networks

- **Filecoin Hyperspace Testnet**: For testing FVM smart contracts
- Get test FIL from: https://hyperspace.yoga/#faucet

### Integration

See `src/lib/fvm-config.ts` for frontend integration with this contract.
