# Blockchain Tip Integration Setup

This guide explains how to integrate on-chain cryptocurrency tips with your streaming platform.

## Architecture Overview

Your platform now has:
✅ Database schema for recording tips
✅ Edge function (`process-tip`) to handle tip verification
✅ Real-time tip feed via Supabase Realtime
✅ Stream total tips tracking

## What You Need to Implement

### Option 1: Frontend Direct Integration (Simpler)

The frontend can directly record tips after blockchain confirmation:

```typescript
// In your tip component after transaction confirmation
const { data: tx } = await sendTransaction({
  to: recipientAddress,
  value: parseEther(amount)
});

// Wait for confirmation
await tx.wait();

// Record in database
await supabase.functions.invoke('process-tip', {
  body: {
    streamId: currentStreamId,
    fromWallet: userAddress,
    amount: parseFloat(amount),
    txHash: tx.hash,
    tokenSymbol: 'ETH',
    network: 'arbitrum'
  }
});
```

### Option 2: Smart Contract Event Listener (Recommended for Production)

Deploy your `StreamTips.sol` contract and set up an automated listener:

#### 1. Deploy Your Smart Contract

```solidity
// StreamTips.sol
contract StreamTips {
  event Tipped(
    bytes32 indexed streamId,
    address indexed from,
    uint256 amount,
    uint256 userTotal,
    uint256 streamTotal
  );
  
  function tip(bytes32 streamId) external payable {
    require(msg.value > 0, "Amount must be positive");
    // ... emit event
  }
}
```

#### 2. Create Event Listener Service

```javascript
// listener.js
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  ['event Tipped(bytes32 indexed streamId, address indexed from, uint256 amount, uint256 userTotal, uint256 streamTotal)'],
  provider
);

// Listen for tips
contract.on('Tipped', async (streamId, from, amount, userTotal, streamTotal, evt) => {
  console.log(`💎 Tip: ${from} → ${ethers.formatEther(amount)} ETH`);
  
  // Call your edge function
  await fetch('https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/process-tip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      streamId: ethers.toUtf8String(streamId).replace(/\0/g, ''),
      fromWallet: from,
      amount: parseFloat(ethers.formatEther(amount)),
      txHash: evt.transactionHash,
      tokenSymbol: 'ETH',
      network: 'arbitrum',
      userTotal: parseFloat(ethers.formatEther(userTotal)),
      streamTotal: parseFloat(ethers.formatEther(streamTotal))
    })
  });
});
```

#### 3. Deploy Listener Service

**Option A: Run on a VPS/Droplet**
```bash
pm2 start listener.js --name tip-listener
```

**Option B: Cloudflare Workers (Cron)**
```javascript
export default {
  async scheduled(event, env, ctx) {
    // Poll for new events every minute
    const events = await contract.queryFilter('Tipped', fromBlock, toBlock);
    // Process each event...
  }
}
```

## Real-time Tip Display

Your frontend can subscribe to tips in real-time:

```typescript
// Subscribe to new tips for a stream
const channel = supabase
  .channel(`stream-tips-${streamId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'tips',
    filter: `metadata->>stream_id=eq.${streamId}`
  }, (payload) => {
    const tip = payload.new;
    showTipAlert(`💎 ${tip.from_wallet} sent ${tip.amount} ${tip.token_symbol}!`);
  })
  .subscribe();
```

## Testing Without Smart Contract

You can test the full flow without deploying a contract:

```typescript
// Simulate a tip
await supabase.functions.invoke('process-tip', {
  body: {
    streamId: 'your-stream-id',
    fromWallet: '0x1234...',
    amount: 10.5,
    txHash: '0xabcd...',
    tokenSymbol: 'USDC',
    network: 'arbitrum'
  }
});
```

## Environment Variables Needed

For your listener service:
- `RPC_URL` - QuickNode or your blockchain RPC endpoint
- `CONTRACT_ADDRESS` - Your deployed StreamTips contract
- `SUPABASE_ANON_KEY` - Found in your .env file
- `SUPABASE_URL` - Found in your .env file

## Next Steps

1. **For MVP**: Use Option 1 (frontend direct integration)
2. **For Production**: Deploy contract + listener (Option 2)
3. **Add UI**: Display real-time tips during streams
4. **Add Analytics**: Show top tippers, total earnings, etc.

The backend infrastructure is ready - you just need to connect your blockchain layer!
