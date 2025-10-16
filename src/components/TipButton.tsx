import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Coins, Loader2 } from 'lucide-react';

interface TipButtonProps {
  recipientUserId: string;
  recipientWalletAddress?: string | null;
  recipientUsername: string;
}

export const TipButton = ({ recipientUserId, recipientWalletAddress, recipientUsername }: TipButtonProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<'ETH' | 'MATIC' | 'custom'>('ETH');
  const { address, isConnected, chain } = useAccount();
  const { sendTransaction, data: hash } = useSendTransaction();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const { toast } = useToast();

  const handleTip = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!recipientWalletAddress) {
      toast({
        title: "No Wallet Connected",
        description: `${recipientUsername} hasn't connected their wallet yet`,
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

    try {
      sendTransaction({
        to: recipientWalletAddress as `0x${string}`,
        value: parseEther(amount),
      });

      // Wait for hash to be available and record tip in database
      if (hash) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await supabase.from('tips').insert({
            from_user_id: user.id,
            to_user_id: recipientUserId,
            from_wallet_address: address,
            to_wallet_address: recipientWalletAddress,
            amount: parseEther(amount).toString(),
            token_symbol: token,
            network: (chain?.name?.toLowerCase() || 'ethereum') as any,
            transaction_hash: hash,
            metadata: {
              amount_display: amount,
            },
          });

          toast({
            title: "Tip Sent! 🎉",
            description: `Successfully sent ${amount} ${token} to ${recipientUsername}`,
          });

          setOpen(false);
          setAmount('');
        }
      }
    } catch (error: any) {
      console.error('Tip error:', error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to send tip",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Coins className="w-4 h-4 mr-2" />
          Tip Creator
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tip {recipientUsername}</DialogTitle>
          <DialogDescription>
            Send crypto directly to support this creator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!recipientWalletAddress ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                {recipientUsername} hasn't connected their wallet yet
              </p>
            </div>
          ) : !isConnected ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Connect your wallet to send tips
              </p>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  placeholder="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="token">Token</Label>
                <Select value={token} onValueChange={(value: any) => setToken(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETH">ETH (Ethereum)</SelectItem>
                    <SelectItem value="MATIC">MATIC (Polygon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleTip} 
                disabled={isConfirming}
                className="w-full"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  `Send ${amount || '0'} ${token}`
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Network: {chain?.name || 'Not connected'}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
