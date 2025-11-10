# Creator Tip Program - Solana

A Solana program (smart contract) that handles creator tipping with an automatic 3% platform fee.

## Overview

- **Platform Fee**: 3% of each tip
- **Creator Receives**: 97% of each tip
- **Fee Split**: Happens atomically in a single transaction
- **Trustless**: All logic on-chain, verifiable by anyone

## Features

- ✅ Automatic 3% platform fee splitting
- ✅ Single transaction (low gas fees)
- ✅ Event emissions for off-chain tracking
- ✅ Optional memo support (for video IDs, messages)
- ✅ Overflow protection
- ✅ Fully tested

## Prerequisites

Install dependencies:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Node dependencies
npm install
```

## Setup

1. **Generate a new keypair for deployment:**
```bash
solana-keygen new -o target/deploy/creator_tip-keypair.json
```

2. **Get the program ID:**
```bash
solana address -k target/deploy/creator_tip-keypair.json
```

3. **Update the program ID in:**
   - `programs/creator-tip/src/lib.rs` (line 6: `declare_id!`)
   - `Anchor.toml` (programs sections)

4. **Set your platform wallet:**
   - Edit `programs/creator-tip/src/lib.rs`
   - Line 90: Replace `YourPlatformWalletPublicKeyHere` with your actual wallet public key

## Build & Test

```bash
# Build the program
anchor build

# Run tests (local validator)
anchor test

# Run tests on devnet
anchor test --provider.cluster devnet
```

## Deploy

### Deploy to Devnet (Testing)

```bash
# Airdrop SOL for deployment
solana airdrop 2 --url devnet

# Deploy
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show <PROGRAM_ID> --url devnet
```

### Deploy to Mainnet (Production)

```bash
# Ensure you have SOL for deployment (~2-3 SOL recommended)
solana balance --url mainnet-beta

# Deploy
anchor deploy --provider.cluster mainnet-beta

# Verify deployment
solana program show <PROGRAM_ID> --url mainnet-beta
```

**Cost:** ~0.5-2 SOL (~$50-200) depending on program size

## Integration

### Frontend Integration (React)

Install dependencies:
```bash
npm install @coral-xyz/anchor @solana/wallet-adapter-react
```

Example usage:
```typescript
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import idl from './creator_tip_idl.json';

const PROGRAM_ID = new PublicKey('YourDeployedProgramID');
const PLATFORM_WALLET = new PublicKey('YourPlatformWalletPublicKey');

function TipButton({ creatorAddress, amount }) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  const sendTip = async () => {
    const provider = new AnchorProvider(connection, wallet, {});
    const program = new Program(idl, PROGRAM_ID, provider);

    const tx = await program.methods
      .sendTip(new BN(amount * LAMPORTS_PER_SOL))
      .accounts({
        tipper: wallet.publicKey,
        creator: new PublicKey(creatorAddress),
        platformWallet: PLATFORM_WALLET,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log('Transaction:', tx);
  };

  return <button onClick={sendTip}>Send Tip</button>;
}
```

### With Memo (Video ID tracking)

```typescript
const tx = await program.methods
  .sendTipWithMemo(
    new BN(amount * LAMPORTS_PER_SOL),
    `video:${videoId}` // Your video identifier
  )
  .accounts({
    tipper: wallet.publicKey,
    creator: new PublicKey(creatorAddress),
    platformWallet: PLATFORM_WALLET,
    systemProgram: web3.SystemProgram.programId,
  })
  .rpc();
```

## Monitoring

### Listen to Events

```typescript
// Subscribe to tip events
program.addEventListener('TipSent', (event, slot) => {
  console.log('Tip received:', {
    tipper: event.tipper.toString(),
    creator: event.creator.toString(),
    amount: event.totalAmount.toNumber() / LAMPORTS_PER_SOL,
    platformFee: event.platformFee.toNumber() / LAMPORTS_PER_SOL,
    creatorAmount: event.creatorAmount.toNumber() / LAMPORTS_PER_SOL,
  });
});
```

### Query Past Tips

```typescript
// Get all tips to a creator
const signatures = await connection.getSignaturesForAddress(PROGRAM_ID);

for (const sig of signatures) {
  const tx = await connection.getParsedTransaction(sig.signature);
  // Parse transaction for tip events
}
```

## Security

- ✅ Overflow checks enabled
- ✅ Amount validation (must be > 0)
- ✅ Platform wallet verification
- ✅ Reentrancy protection (via CPI)
- ✅ Tested edge cases

## Cost Analysis

### Deployment
- Devnet: FREE (test tokens)
- Mainnet: ~0.5-2 SOL one-time

### Per-Transaction
- Gas fee: ~0.00001 SOL (~$0.001)
- Much cheaper than Ethereum!

## Troubleshooting

### "Program ID mismatch"
- Rebuild: `anchor build`
- Update `declare_id!` in `lib.rs`
- Redeploy

### "Insufficient funds"
- Airdrop: `solana airdrop 2 --url devnet`
- Or fund wallet: `solana transfer <ADDRESS> 2 --url mainnet-beta`

### "Platform wallet mismatch"
- Verify `PLATFORM_WALLET` constant matches your wallet
- Redeploy if changed

## License

MIT

## Support

For issues or questions, contact: your-email@example.com
