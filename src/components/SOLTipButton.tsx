import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';

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
      // Create recipient public key
      const recipientPubKey = new PublicKey(recipientSOLAddress);

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubKey,
          lamports: Math.floor(tipAmount * LAMPORTS_PER_SOL),
        })
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Record tip in database
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.functions.invoke('record-tip', {
        body: {
          fromUserId: user?.id,
          toUserId: recipientUserId,
          amount: tipAmount.toString(),
          transactionHash: signature,
          network: 'solana',
          tokenSymbol: 'SOL',
          fromWalletAddress: publicKey.toString(),
          toWalletAddress: recipientSOLAddress,
          videoId,
        },
      });

      toast({
        title: 'Tip sent!',
        description: `Successfully sent ${tipAmount} SOL to ${recipientUsername}`,
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
              'Send Tip'
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
