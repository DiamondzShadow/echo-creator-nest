# TipJar Contract Deployment Guide

## 🎯 Overview

The **TipJar** contract is a secure, decentralized tipping system that automatically:
- Takes **3% platform fee** on every tip
- Sends fee to: `0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363`
- Sends **97%** directly to the creator
- Supports both **native currency** (ETH/MATIC) and **ERC20 tokens**

## 🔐 Security Features

✅ **ReentrancyGuard** - Prevents reentrancy attacks  
✅ **Pausable** - Emergency stop functionality  
✅ **Ownable** - Admin controls  
✅ **SafeERC20** - Secure token transfers  
✅ **Immutable Platform Wallet** - Fee address cannot be changed  

---

## 📦 Deployment Steps

### Option 1: Remix IDE (Easiest)

1. **Install Dependencies**
   - Go to [Remix IDE](https://remix.ethereum.org)
   - Install OpenZeppelin contracts plugin

2. **Copy Contract**
   - Copy `contracts/TipJar.sol` into Remix
   - It will auto-import OpenZeppelin dependencies

3. **Compile**
   - Select Solidity compiler `0.8.20` or higher
   - Click "Compile TipJar.sol"

4. **Deploy**
   - Switch to "Deploy & Run Transactions" tab
   - Select your network (MetaMask)
   - Constructor parameter: `0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363`
   - Click "Deploy"
   - Confirm transaction in MetaMask

5. **Verify Contract** (Recommended)
   - Copy deployed contract address
   - Go to block explorer (Etherscan/Polygonscan)
   - Verify using "Single File" method
   - Flatten imports in Remix first

### Option 2: Hardhat (Advanced)

```bash
# Install dependencies
npm install --save-dev hardhat @openzeppelin/contracts

# Create deployment script
npx hardhat run scripts/deploy-tipjar.js --network polygon
```

**deploy-tipjar.js:**
```javascript
const hre = require("hardhat");

async function main() {
  const platformWallet = "0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363";
  
  const TipJar = await hre.ethers.getContractFactory("TipJar");
  const tipjar = await TipJar.deploy(platformWallet);
  
  await tipjar.deployed();
  
  console.log("TipJar deployed to:", tipjar.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Option 3: Foundry (Professional)

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Deploy
forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  contracts/TipJar.sol:TipJar \
  --constructor-args 0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363
```

---

## 🌐 Recommended Networks

### Development/Testing
- **Polygon Mumbai** (Testnet)
  - Get test MATIC: https://faucet.polygon.technology
  - RPC: https://rpc-mumbai.maticvigil.com
  - Very fast, free

### Production
1. **Polygon** (Recommended)
   - Gas: ~$0.01 per transaction
   - Fast, widely adopted
   - Best for high-volume tipping

2. **Base** (Coinbase L2)
   - Gas: ~$0.05 per transaction
   - Growing ecosystem
   - Good Coinbase integration

3. **Arbitrum**
   - Gas: ~$0.10 per transaction
   - Mature DeFi ecosystem

---

## 💻 Frontend Integration

### 1. Update Contract Address

After deployment, update `src/lib/web3-config.ts`:

```typescript
export const TIPJAR_CONTRACT_ADDRESSES = {
  polygon: '0xYOUR_DEPLOYED_ADDRESS',
  base: '0xYOUR_DEPLOYED_ADDRESS',
  arbitrum: '0xYOUR_DEPLOYED_ADDRESS',
  // Add for each network you deploy to
}

export const TIPJAR_ABI = [
  {
    "inputs": [{"internalType": "address payable", "name": "creator", "type": "address"}],
    "name": "tipWithNative",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "tipWithToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "calculateTipSplit",
    "outputs": [
      {"internalType": "uint256", "name": "platformFee", "type": "uint256"},
      {"internalType": "uint256", "name": "creatorAmount", "type": "uint256"}
    ],
    "stateMutability": "pure",
    "type": "function"
  }
]
```

### 2. Update TipButton Component

Modify `src/components/TipButton.tsx` to use the contract:

```typescript
import { useWriteContract, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { TIPJAR_CONTRACT_ADDRESSES, TIPJAR_ABI } from '@/lib/web3-config';

export function TipButton({ recipientAddress, recipientUsername }) {
  const { address, chain } = useAccount();
  const { writeContract } = useWriteContract();

  const sendTip = async (amount: string) => {
    const contractAddress = TIPJAR_CONTRACT_ADDRESSES[chain.network];
    
    await writeContract({
      address: contractAddress,
      abi: TIPJAR_ABI,
      functionName: 'tipWithNative',
      args: [recipientAddress],
      value: parseEther(amount),
    });
  };

  return (
    <Button onClick={() => sendTip('0.01')}>
      Tip {recipientUsername}
    </Button>
  );
}
```

---

## 🧪 Testing the Contract

### Test on Remix
1. Deploy to testnet
2. Call `tipWithNative` with test ETH
3. Check `totalTipsProcessed` increased
4. Verify 3% went to `0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363`

### Calculate Split Preview
```javascript
// In browser console or script
const amount = ethers.utils.parseEther("1.0"); // 1 ETH
const [platformFee, creatorAmount] = await contract.calculateTipSplit(amount);

console.log("Platform Fee:", ethers.utils.formatEther(platformFee)); // 0.03 ETH
console.log("Creator Gets:", ethers.utils.formatEther(creatorAmount)); // 0.97 ETH
```

---

## 📊 Contract Functions

### User Functions
- `tipWithNative(address creator)` - Tip with ETH/MATIC/native currency
- `tipWithToken(address creator, address token, uint256 amount)` - Tip with ERC20 tokens
- `calculateTipSplit(uint256 amount)` - Preview fee split

### Admin Functions (Owner Only)
- `pause()` - Pause all tipping in emergency
- `unpause()` - Resume tipping
- `emergencyWithdraw()` - Recover stuck native currency
- `emergencyWithdrawToken(address token)` - Recover stuck tokens

### View Functions
- `platformWallet()` - Returns `0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363`
- `PLATFORM_FEE_PERCENTAGE()` - Returns `300` (3%)
- `totalTipsProcessed()` - Total number of tips
- `totalPlatformFeesCollected()` - Total fees collected

---

## 🎉 Example Tip Flow

1. **User tips 1 MATIC to creator**
2. Contract calculates:
   - Platform fee: 0.03 MATIC → `0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363`
   - Creator gets: 0.97 MATIC → Creator's wallet
3. Event emitted with full details
4. Database updated via your backend
5. UI shows success message

---

## 💰 Gas Estimates

| Network | Deployment | Tip (Native) | Tip (ERC20) |
|---------|-----------|--------------|-------------|
| Polygon | ~$0.50 | ~$0.01 | ~$0.02 |
| Base | ~$2.00 | ~$0.05 | ~$0.10 |
| Arbitrum | ~$3.00 | ~$0.10 | ~$0.15 |

---

## 🚨 Security Notes

1. **Platform wallet is immutable** - Cannot be changed after deployment
2. **Direct transfers** - No funds held in contract (reduces attack surface)
3. **Reentrancy protected** - Safe against reentrancy attacks
4. **Pausable** - Can pause in emergency
5. **Audited OpenZeppelin** - Uses battle-tested libraries

---

## 📞 Support

After deployment:
1. Test with small amounts first
2. Verify on block explorer
3. Update frontend with contract address
4. Monitor events in your backend

**Platform Fee Wallet:** `0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363`  
**Fee Percentage:** 3% (fixed)  
**Creator Receives:** 97% (automatic)

---

## ✅ Deployment Checklist

- [ ] Compile contract successfully
- [ ] Deploy to testnet first
- [ ] Test tipping with small amounts
- [ ] Verify platform wallet receives 3%
- [ ] Deploy to mainnet
- [ ] Verify contract on block explorer
- [ ] Update frontend with contract address
- [ ] Add ABI to web3-config.ts
- [ ] Update TipButton component
- [ ] Test end-to-end flow
- [ ] Monitor first few tips

---

**Ready to deploy?** Start with Polygon Mumbai testnet, then move to Polygon mainnet for production! 🚀
