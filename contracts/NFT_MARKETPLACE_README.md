# NFT Marketplace & Custom Tipping Smart Contracts

This directory contains the Solidity smart contracts for the NFT Marketplace and Custom Video Tipping functionality.

## 📄 Contracts

### 1. CreatorNFT.sol
**ERC721 NFT Contract with Royalties**

- Full ERC721 implementation with enumerable and URI storage
- Customizable royalties (0-30%) set at mint time
- Minting fee: 0.001 ETH
- Tracks original creator for royalty payments
- Compatible with OpenSea and other NFT marketplaces

**Key Features:**
- `mintNFT(address to, string uri, uint256 royaltyPercentage)` - Mint new NFT
- `calculateRoyalty(uint256 tokenId, uint256 salePrice)` - Get royalty info
- `tokensOfOwner(address owner)` - Get all NFTs owned by address
- Security: ReentrancyGuard, Ownable

### 2. NFTMarketplace.sol
**Decentralized NFT Marketplace**

- Buy and sell NFTs with automatic fee distribution
- Platform fee: 2.5% of sale price
- Automatic royalty payments to original creators
- Support for both native currency (ETH/MATIC) and ERC20 tokens
- Listing management (create, update, cancel)

**Key Features:**
- `listNFT(address nftContract, uint256 tokenId, uint256 price, address paymentToken)` - List NFT
- `buyNFT(uint256 listingId)` - Purchase listed NFT
- `cancelListing(uint256 listingId)` - Cancel your listing
- `updatePrice(uint256 listingId, uint256 newPrice)` - Update listing price
- Security: ReentrancyGuard, Pausable, Ownable

### 3. VideoTipping.sol
**Enhanced Tipping with Custom Fees**

- Base platform fee: 3%
- Custom creator fees: 0-50% per video
- Transparent fee breakdown before tipping
- Support for both native currency and ERC20 tokens
- On-chain fee settings storage

**Key Features:**
- `setVideoTipSettings(string videoId, uint256 customFeePercentage)` - Set custom fee
- `tipVideoWithNative(string videoId, address creator)` - Tip with ETH/MATIC
- `tipVideoWithToken(string videoId, address creator, address token, uint256 amount)` - Tip with tokens
- `calculateTipBreakdown(string videoId, uint256 amount)` - Preview fee breakdown
- Security: ReentrancyGuard, Pausable, Ownable

### 4. TipJar.sol
**Original Simple Tipping Contract**

- Fixed 3% platform fee
- Support for native currency and ERC20 tokens
- Used for general tipping (not video-specific)

### 5. YouTube.sol
**Video Metadata Storage**

- Stores video metadata on-chain
- Used for FVM (Filecoin) video uploads
- Simple and lightweight

## 🔧 OpenZeppelin Dependencies

All contracts use OpenZeppelin's audited implementations:

```solidity
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
```

## 🚀 Deployment Order

1. **Deploy CreatorNFT** with platform wallet address
2. **Deploy NFTMarketplace** with platform wallet address  
3. **Deploy VideoTipping** with platform wallet address
4. (Optional) **Deploy TipJar** if not already deployed
5. (Optional) **Deploy YouTube** for FVM integration

## 💰 Fee Structure

### NFT Operations
- **Minting**: 0.001 ETH → Platform
- **Sale**: 2.5% of price → Platform
- **Royalty**: 0-30% of price → Original Creator
- **Remaining**: 67.5-97.5% → Seller

### Tipping Operations
- **Platform Fee**: 3% → Platform
- **Custom Fee**: 0-50% → Creator (optional)
- **Base Amount**: 50-97% → Creator

## 🔐 Security Features

1. **ReentrancyGuard**: Prevents reentrancy attacks
2. **Pausable**: Can pause contracts in emergencies
3. **Ownable**: Only owner can call admin functions
4. **SafeERC20**: Safe token transfers
5. **Input Validation**: Comprehensive checks on all inputs
6. **Events**: All important actions emit events for tracking

## 📊 Events

### CreatorNFT Events
```solidity
event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI, uint256 royaltyPercentage, uint256 timestamp)
event RoyaltyPaid(uint256 indexed tokenId, address indexed creator, address indexed buyer, uint256 amount, uint256 timestamp)
```

### NFTMarketplace Events
```solidity
event NFTListed(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price, address paymentToken, uint256 timestamp)
event NFTSold(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, address buyer, uint256 price, uint256 platformFee, uint256 royaltyAmount, uint256 sellerAmount, uint256 timestamp)
event ListingCancelled(uint256 indexed listingId, address indexed seller, uint256 timestamp)
event PriceUpdated(uint256 indexed listingId, uint256 oldPrice, uint256 newPrice, uint256 timestamp)
```

### VideoTipping Events
```solidity
event VideoTipSettingsCreated(string indexed videoId, address indexed creator, uint256 customFeePercentage, uint256 timestamp)
event VideoTipSettingsUpdated(string indexed videoId, address indexed creator, uint256 oldFeePercentage, uint256 newFeePercentage, uint256 timestamp)
event TipSentToVideo(string indexed videoId, address indexed tipper, address indexed creator, uint256 totalAmount, uint256 platformFee, uint256 customFee, uint256 creatorAmount, address token, uint256 timestamp)
```

## 🧪 Testing Checklist

- [ ] Deploy all contracts successfully
- [ ] Mint NFT with 0%, 10%, and 30% royalty
- [ ] List NFT on marketplace
- [ ] Buy NFT and verify all payments (platform, royalty, seller)
- [ ] Cancel listing
- [ ] Update listing price
- [ ] Set video tip settings (0%, 10%, 50%)
- [ ] Tip video and verify fee distribution
- [ ] Test pause/unpause functionality
- [ ] Test emergency withdrawal
- [ ] Verify contract on block explorer
- [ ] Test with ERC20 tokens
- [ ] Gas optimization tests

## 🔍 Gas Optimization

Contracts are optimized for gas efficiency:
- Using `immutable` for constants set in constructor
- Batch operations where possible
- Minimal storage reads/writes
- Efficient data structures

## 📝 Notes

1. **Platform Wallet**: Set this to a secure multi-sig wallet in production
2. **Fee Updates**: Only contract owner can update platform fees
3. **Emergency Functions**: Test thoroughly before using in production
4. **Royalty Standards**: Follows EIP-2981 royalty standard concepts
5. **IPFS Integration**: Metadata URIs should point to IPFS for decentralization

## 🛠️ Compilation

Using Solidity version `^0.8.20` with optimizer enabled.

```json
{
  "optimizer": {
    "enabled": true,
    "runs": 200
  }
}
```

## 📚 Additional Resources

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [ERC721 Standard](https://eips.ethereum.org/EIPS/eip-721)
- [EIP-2981 Royalty Standard](https://eips.ethereum.org/EIPS/eip-2981)
- [Hardhat Documentation](https://hardhat.org/docs)

## ⚠️ Production Considerations

Before deploying to mainnet:

1. **Audit**: Get contracts audited by a reputable security firm
2. **Testing**: Extensive testing on testnets
3. **Multi-sig**: Use multi-sig wallet for owner functions
4. **Insurance**: Consider smart contract insurance
5. **Monitoring**: Set up monitoring and alerting
6. **Upgradability**: Consider proxy patterns for upgradability
7. **Gas Costs**: Test and optimize gas costs
8. **Documentation**: Keep comprehensive documentation

## 📞 Support

For technical questions about the contracts:
- Review OpenZeppelin documentation
- Check Ethereum Stack Exchange
- Consult with Solidity developers
- Test thoroughly on testnets first

---

**Version**: 1.0.0  
**Solidity**: ^0.8.20  
**License**: MIT
