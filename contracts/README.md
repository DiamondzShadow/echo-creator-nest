# CreatorHub Smart Contracts

This directory contains the smart contracts for the CreatorHub decentralized platform.

## 📜 Contracts

### 1. YouTube.sol
Decentralized video metadata storage on Filecoin Virtual Machine (FVM).

**Features:**
- Store video metadata on-chain
- IPFS hash storage
- Video categorization
- Author attribution

**Status:** ✅ Ready for deployment

---

### 2. TipJar.sol ⭐ NEW
Professional tipping contract with automatic platform fee distribution.

**Features:**
- ✅ **3% Platform Fee** - Automatically sent to platform wallet
- ✅ **97% to Creator** - Direct transfer, no holding
- ✅ **Native Currency Tips** - ETH, MATIC, etc.
- ✅ **ERC20 Token Tips** - Support for any token
- ✅ **Security Features** - ReentrancyGuard, Pausable, Ownable
- ✅ **Event Tracking** - Full transaction history
- ✅ **Emergency Controls** - Pause functionality

**Platform Fee Wallet:** `0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363`

**Status:** ✅ Ready for deployment

**Deployment Guide:** See [TIPJAR_DEPLOYMENT.md](./TIPJAR_DEPLOYMENT.md)

---

## 🚀 Quick Start

### Deploy TipJar (Recommended First)

1. **Using Remix IDE** (Easiest):
   ```
   1. Go to https://remix.ethereum.org
   2. Copy TipJar.sol into Remix
   3. Compile with Solidity 0.8.20+
   4. Deploy with constructor arg: 0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363
   5. Confirm transaction
   ```

2. **Networks**:
   - **Test:** Polygon Mumbai (free test tokens)
   - **Production:** Polygon mainnet (~$0.50 deploy, $0.01 per tip)

3. **After Deployment**:
   - Copy contract address
   - Update `src/lib/web3-config.ts`
   - Test with small tip
   - Verify on block explorer

### Deploy YouTube.sol (For FVM/IPFS Features)

1. Deploy to Filecoin Calibration testnet
2. Test video upload
3. Deploy to Filecoin mainnet

---

## 🔐 Security

All contracts use OpenZeppelin libraries:
- `@openzeppelin/contracts/security/ReentrancyGuard.sol`
- `@openzeppelin/contracts/security/Pausable.sol`
- `@openzeppelin/contracts/access/Ownable.sol`
- `@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol`

---

## 💡 Integration

### Frontend Integration Example

```typescript
// Tip with native currency (ETH/MATIC)
const tx = await contract.tipWithNative(creatorAddress, {
  value: ethers.utils.parseEther("0.1") // 0.1 ETH
});

// Platform automatically gets 0.003 ETH (3%)
// Creator receives 0.097 ETH (97%)
```

### Event Monitoring

```typescript
contract.on("TipSent", (tipper, creator, amount, platformFee, creatorAmount, token, timestamp) => {
  console.log(`Tip: ${amount}`);
  console.log(`Platform Fee: ${platformFee}`);
  console.log(`Creator Received: ${creatorAmount}`);
});
```

---

## 📊 Gas Costs

| Contract | Network | Deployment | Per Transaction |
|----------|---------|------------|-----------------|
| TipJar | Polygon | ~$0.50 | ~$0.01 |
| TipJar | Base | ~$2.00 | ~$0.05 |
| YouTube | FVM | ~$1.00 | ~$0.05 |

---

## 🧪 Testing

### Test on Mumbai Testnet

1. Get test MATIC: https://faucet.polygon.technology
2. Deploy TipJar
3. Send test tip
4. Verify fee went to platform wallet
5. Verify creator received 97%

---

## 📚 Resources

- [TipJar Deployment Guide](./TIPJAR_DEPLOYMENT.md)
- [OpenZeppelin Docs](https://docs.openzeppelin.com/contracts)
- [Remix IDE](https://remix.ethereum.org)
- [Polygon Docs](https://docs.polygon.technology)

---

## 🎯 Next Steps

1. **Deploy TipJar** to Polygon Mumbai (testnet)
2. **Test tipping** with small amounts
3. **Deploy to mainnet** when ready
4. **Update frontend** with contract address
5. **Monitor platform fees** in your wallet

---

**Platform Fee Wallet:** `0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363`  
**Automatic Fee:** 3% on every tip  
**Creator Receives:** 97% directly

**Questions?** See [TIPJAR_DEPLOYMENT.md](./TIPJAR_DEPLOYMENT.md) for detailed instructions.
