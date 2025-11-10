# Interim Tipping Solution (Works Today)

While you build and deploy the Solana program, here's what works **RIGHT NOW** for collecting platform fees.

## Quick Summary

| Chain | Interim Solution | Long-term Solution |
|-------|-----------------|-------------------|
| **EVM** | ✅ TipJar contract (deployed) | ✅ Already done! |
| **Solana** | ⚠️ Two transactions | ✅ Deploy Anchor program |
| **XRP** | ⚠️ Backend fee collection | ⚠️ Wait for XRP Hooks |

---

## Option 1: Two-Transaction Approach (Quick)

### Solana: Split into 2 Transfers

**Updated `SOLTipButton.tsx`:**

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';

// Platform wallet (replace with your actual wallet)
const PLATFORM_WALLET = new PublicKey('YourPlatformSolanaWalletHere');

interface SOLTipButtonProps {
  recipientUserId: string;
  recipientSOLAddress?: string | null;
  recipientUsername: string;
  videoId?: string;
}

export const SOLTipButton = ({
  recipientUserId,
  recipientSOLAddress,
  recipientUsername,
  videoId,
}: SOLTipButtonProps) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const handleTip = async () => {
    if (!publicKey) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your Solana wallet first',
        variant: 'destructive',
      });
      return;
    }

    if (!recipientSOLAddress) {
      toast({
        title: 'No SOL address',
        description: `${recipientUsername} hasn't set up their SOL address yet`,
        variant: 'destructive',
      });
      return;
    }

    const tipAmount = parseFloat(amount);
    if (!tipAmount || tipAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid tip amount',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Calculate split (3% platform, 97% creator)
      const platformFee = tipAmount * 0.03;
      const creatorAmount = tipAmount * 0.97;

      const recipientPubKey = new PublicKey(recipientSOLAddress);

      // Create transaction with BOTH transfers
      const transaction = new Transaction();
      
      // Transfer 1: To creator (97%)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubKey,
          lamports: Math.floor(creatorAmount * LAMPORTS_PER_SOL),
        })
      );

      // Transfer 2: To platform (3%)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: PLATFORM_WALLET,
          lamports: Math.floor(platformFee * LAMPORTS_PER_SOL),
        })
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send single transaction with both transfers
      const signature = await sendTransaction(transaction, connection);

      toast({
        title: 'Transaction sent',
        description: 'Waiting for confirmation...',
      });

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Record tip in database
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.functions.invoke('record-tip', {
        body: {
          to_user_id: recipientUserId,
          to_wallet_address: recipientSOLAddress,
          from_user_id: user?.id,
          from_wallet_address: publicKey.toString(),
          amount: Math.floor(tipAmount * LAMPORTS_PER_SOL).toString(),
          token_symbol: 'SOL',
          network: 'solana',
          transaction_hash: signature,
          metadata: {
            amount_display: tipAmount.toString(),
            platform_fee: platformFee.toString(),
            creator_amount: creatorAmount.toString(),
            video_id: videoId,
          },
        },
      });

      toast({
        title: 'Tip sent! 🎉',
        description: `${recipientUsername} received ${creatorAmount.toFixed(4)} SOL (you tipped ${tipAmount} SOL)`,
      });

      setAmount('');
    } catch (error: any) {
      console.error('Error sending tip:', error);
      toast({
        title: 'Transaction failed',
        description: error.message || 'Failed to send tip',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!recipientSOLAddress ? (
        <p className="text-sm text-muted-foreground">
          {recipientUsername} hasn't set up their Solana address yet
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (SOL)</label>
            <Input
              type="number"
              placeholder="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              disabled={loading}
            />
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creator receives:</span>
                <span className="font-medium">
                  {(parseFloat(amount) * 0.97).toFixed(4)} SOL
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform fee (3%):</span>
                <span className="font-medium">
                  {(parseFloat(amount) * 0.03).toFixed(4)} SOL
                </span>
              </div>
              <div className="border-t pt-1 flex justify-between font-semibold">
                <span>Total:</span>
                <span>{amount} SOL</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {[0.1, 0.5, 1].map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => setAmount(preset.toString())}
                disabled={loading}
              >
                {preset} SOL
              </Button>
            ))}
          </div>

          <Button
            onClick={handleTip}
            disabled={loading || !amount || !publicKey}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              `Send ${amount || '0'} SOL`
            )}
          </Button>

          {!publicKey && (
            <p className="text-xs text-muted-foreground text-center">
              Connect your Solana wallet to send tips
            </p>
          )}
        </>
      )}
    </div>
  );
};
```

### XRP: Split into 2 Payments

**Updated `XRPTipButton.tsx`:**

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Coins, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { xrpToDrops } from 'xrpl';

// Platform XRP address (replace with your actual address)
const PLATFORM_XRP_ADDRESS = 'rYourPlatformXRPAddressHere';

interface XRPTipButtonProps {
  recipientUserId: string;
  recipientXRPAddress?: string | null;
  recipientUsername: string;
  videoId?: string;
}

export const XRPTipButton = ({ 
  recipientUserId, 
  recipientXRPAddress, 
  recipientUsername,
  videoId 
}: XRPTipButtonProps) => {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleXRPTip = async () => {
    if (!recipientXRPAddress) {
      toast({
        title: "No XRP Address",
        description: `${recipientUsername} hasn't connected their XRP wallet yet`,
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid tip amount",
        variant: "destructive",
      });
      return;
    }

    if (!window.xumm) {
      toast({
        title: "XRP Wallet Required",
        description: "Please install Xumm wallet to send XRP tips",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const tipAmount = parseFloat(amount);
      const platformFee = tipAmount * 0.03; // 3%
      const creatorAmount = tipAmount * 0.97; // 97%

      // Payment 1: To creator (97%)
      const creatorPayload = {
        TransactionType: 'Payment',
        Destination: recipientXRPAddress,
        Amount: xrpToDrops(creatorAmount.toFixed(6)),
        Memos: [{
          Memo: {
            MemoData: Buffer.from(
              JSON.stringify({ 
                type: 'creator_tip',
                video_id: videoId,
                total_amount: tipAmount
              })
            ).toString('hex')
          }
        }]
      };

      toast({
        title: "Sign Payment 1/2",
        description: "Approve the payment to the creator",
      });

      // @ts-ignore
      const creatorResult = await window.xumm.payload.createAndSubscribe(creatorPayload);
      
      if (!creatorResult?.payload_uuidv4) {
        throw new Error('Failed to create creator payment');
      }

      const creatorSignature = await creatorResult.resolved;
      
      if (!creatorSignature?.txid) {
        throw new Error('Creator payment was not completed');
      }

      // Payment 2: To platform (3%)
      const platformPayload = {
        TransactionType: 'Payment',
        Destination: PLATFORM_XRP_ADDRESS,
        Amount: xrpToDrops(platformFee.toFixed(6)),
        Memos: [{
          Memo: {
            MemoData: Buffer.from(
              JSON.stringify({ 
                type: 'platform_fee',
                related_tx: creatorSignature.txid
              })
            ).toString('hex')
          }
        }]
      };

      toast({
        title: "Sign Payment 2/2",
        description: "Approve the platform fee payment",
      });

      // @ts-ignore
      const platformResult = await window.xumm.payload.createAndSubscribe(platformPayload);
      
      if (!platformResult?.payload_uuidv4) {
        throw new Error('Failed to create platform fee payment');
      }

      const platformSignature = await platformResult.resolved;
      
      if (!platformSignature?.txid) {
        throw new Error('Platform fee payment was not completed');
      }

      // Record the tip
      const { data: { session } } = await supabase.auth.getSession();

      await supabase.functions.invoke('record-xrp-tip', {
        body: {
          video_id: videoId,
          to_user_id: recipientUserId,
          to_wallet_address: recipientXRPAddress,
          from_user_id: session?.user?.id,
          from_wallet_address: creatorSignature.account,
          amount: xrpToDrops(tipAmount),
          network: 'xrp',
          transaction_hash: creatorSignature.txid,
          token_symbol: 'XRP',
          metadata: {
            amount_display: tipAmount.toString(),
            platform_fee: platformFee.toString(),
            creator_amount: creatorAmount.toString(),
            platform_tx: platformSignature.txid,
          },
        },
      });

      toast({
        title: "XRP Tip Sent! 🎉",
        description: `${recipientUsername} received ${creatorAmount.toFixed(2)} XRP`,
      });
      
      setOpen(false);
      setAmount('');
    } catch (error) {
      console.error('XRP tip error:', error);
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to send XRP tip",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ... rest of component (UI code stays the same)
};
```

---

## Option 2: Backend Fee Collection (Better UX for XRP)

For XRP, a better approach is **backend fee withdrawal**:

### How it Works:

1. **User sends 100% to creator** (simple, one signature)
2. **Backend tracks balances** (database)
3. **Creator withdraws with fee deducted** (you control)

### Database Migration:

```sql
-- Add to your Supabase migrations
CREATE TABLE IF NOT EXISTS creator_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  chain TEXT NOT NULL, -- 'xrp', 'solana', etc.
  total_tips_received NUMERIC DEFAULT 0,
  platform_fees_owed NUMERIC DEFAULT 0,
  withdrawn NUMERIC DEFAULT 0,
  available_balance NUMERIC GENERATED ALWAYS AS (
    total_tips_received - platform_fees_owed - withdrawn
  ) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update balances when tips are received
CREATE OR REPLACE FUNCTION update_creator_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO creator_balances (user_id, chain, total_tips_received, platform_fees_owed)
  VALUES (
    NEW.to_user_id,
    NEW.network,
    CAST(NEW.amount AS NUMERIC),
    CAST(NEW.amount AS NUMERIC) * 0.03
  )
  ON CONFLICT (user_id, chain) DO UPDATE SET
    total_tips_received = creator_balances.total_tips_received + CAST(NEW.amount AS NUMERIC),
    platform_fees_owed = creator_balances.platform_fees_owed + (CAST(NEW.amount AS NUMERIC) * 0.03),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_tip_received
AFTER INSERT ON tips
FOR EACH ROW
WHEN (NEW.network IN ('xrp', 'solana'))
EXECUTE FUNCTION update_creator_balance();
```

### Withdrawal UI Component:

```typescript
// src/components/CreatorWithdrawal.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const CreatorWithdrawal = () => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('creator_balances')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    setBalance(data);
  };

  const requestWithdrawal = async (chain: string) => {
    setLoading(true);
    
    try {
      const { error } = await supabase.functions.invoke('process-withdrawal', {
        body: { chain }
      });

      if (error) throw error;

      toast({
        title: 'Withdrawal Requested',
        description: 'Your withdrawal will be processed within 24 hours',
      });

      fetchBalance();
    } catch (error) {
      toast({
        title: 'Withdrawal Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!balance) return <div>Loading...</div>;

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Your Balance</h2>
      
      <div className="space-y-4">
        <div className="border-b pb-2">
          <div className="flex justify-between">
            <span>Total Tips Received:</span>
            <span className="font-bold">{balance.total_tips_received} XRP</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Platform Fee (3%):</span>
            <span>-{balance.platform_fees_owed} XRP</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Already Withdrawn:</span>
            <span>-{balance.withdrawn} XRP</span>
          </div>
        </div>

        <div className="flex justify-between text-lg font-bold">
          <span>Available to Withdraw:</span>
          <span className="text-green-600">{balance.available_balance} XRP</span>
        </div>

        <Button 
          onClick={() => requestWithdrawal('xrp')}
          disabled={loading || balance.available_balance <= 0}
          className="w-full"
        >
          Request Withdrawal
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Withdrawals are processed within 24 hours
        </p>
      </div>
    </Card>
  );
};
```

### Withdrawal Edge Function:

```typescript
// supabase/functions/process-withdrawal/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client, Wallet } from 'xrpl';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { chain } = await req.json();
    
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabase.auth.getUser(authHeader);

    // Get user's balance
    const { data: balance } = await supabase
      .from('creator_balances')
      .select('*')
      .eq('user_id', user.id)
      .eq('chain', chain)
      .single();

    if (!balance || balance.available_balance <= 0) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400
      });
    }

    // Get user's withdrawal address
    const { data: profile } = await supabase
      .from('profiles')
      .select('xrp_address')
      .eq('id', user.id)
      .single();

    if (!profile?.xrp_address) {
      return new Response(JSON.stringify({ error: 'No XRP address set' }), {
        status: 400
      });
    }

    // Connect to XRP Ledger and send payment
    const client = new Client('wss://xrplcluster.com/');
    await client.connect();

    const wallet = Wallet.fromSeed(Deno.env.get('PLATFORM_XRP_SECRET')!);
    
    const payment = {
      TransactionType: 'Payment',
      Account: wallet.address,
      Destination: profile.xrp_address,
      Amount: String(Math.floor(balance.available_balance * 1000000)), // Convert to drops
    };

    const result = await client.submit(payment, { wallet });
    
    if (result.result.meta.TransactionResult === 'tesSUCCESS') {
      // Update balance
      await supabase
        .from('creator_balances')
        .update({
          withdrawn: balance.withdrawn + balance.available_balance
        })
        .eq('user_id', user.id)
        .eq('chain', chain);

      return new Response(JSON.stringify({ 
        success: true,
        transaction: result.result.hash
      }));
    }

    throw new Error('Transaction failed');
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
});
```

---

## Recommendation

**Right Now (Today):**
- ✅ EVM: Keep using TipJar contract (working great!)
- ⚠️ Solana: Use two-transaction approach (works but not ideal)
- ✅ XRP: Use backend fee collection (best UX)

**Next Week:**
- 🚀 Build and deploy Solana program (1-2 days)
- 🚀 Migrate Solana tips to use program

**Future:**
- Deploy TipJar to Polygon, Base (cheap gas)
- Wait for XRP Hooks to mature
- Consider Solana SPL token support (USDC)

---

## Summary

You have **3 viable paths** for collecting platform fees:

1. **Smart Contracts** (EVM, Solana) - Trustless, professional ✅
2. **Two Transactions** (Quick fix) - Works but UX is meh ⚠️
3. **Backend Processing** (XRP) - Best UX for chains without contracts ✅

Start with #2 and #3 today, migrate to #1 for Solana when ready!
