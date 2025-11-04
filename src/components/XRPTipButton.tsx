import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Coins, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Client, Wallet, xrpToDrops } from 'xrpl';

interface XRPTipButtonProps {
  recipientUserId: string;
  recipientXRPAddress?: string | null;
  recipientUsername: string;
  videoId?: string; // Optional - for video-specific tips
}

export const XRPTipButton = ({ 
  recipientUserId, 
  recipientXRPAddress, 
  recipientUsername,
  videoId 
}: XRPTipButtonProps) => {
  const [open, setOpen] = useState(false);
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

    // Check if Xumm wallet is available
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
      // Request payment via Xumm
      const payload = {
        TransactionType: 'Payment',
        Destination: recipientXRPAddress,
        Amount: xrpToDrops(amount),
      };

      // @ts-ignore - Xumm SDK types
      const result = await window.xumm.payload.createAndSubscribe(payload);
      
      if (!result || !result.payload_uuidv4) {
        throw new Error('Failed to create payment request');
      }

      // Wait for user to sign
      const signature = await result.resolved;
      
      if (!signature || signature.payload_uuidv4 !== result.payload_uuidv4) {
        throw new Error('Payment was not completed');
      }

      // Get transaction hash
      const txHash = signature.txid;

      // Record the tip
      const { data: { session } } = await supabase.auth.getSession();
      const fromUserId = session?.user?.id;

      const { error } = await supabase.functions.invoke('record-xrp-tip', {
        body: {
          video_id: videoId,
          to_user_id: recipientUserId,
          to_wallet_address: recipientXRPAddress,
          from_user_id: fromUserId,
          from_wallet_address: signature.account,
          amount: xrpToDrops(amount),
          network: 'xrp',
          transaction_hash: txHash,
          token_symbol: 'XRP',
          metadata: {
            amount_display: amount,
          },
        },
      });

      if (error) {
        console.error('Error recording XRP tip:', error);
        toast({
          title: "Recording Failed",
          description: "Tip sent but failed to record. Please contact support.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "XRP Tip Sent! 🎉",
          description: `Successfully sent ${amount} XRP to ${recipientUsername}`,
        });
        setOpen(false);
        setAmount('');
      }
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Coins className="w-4 h-4" />
          Tip XRP
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tip {recipientUsername} with XRP</DialogTitle>
          <DialogDescription>
            Send XRP to support this creator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!recipientXRPAddress ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {recipientUsername} hasn't connected their XRP wallet yet
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div>
                <Label htmlFor="xrp-amount">Amount (XRP)</Label>
                <Input
                  id="xrp-amount"
                  type="number"
                  step="0.01"
                  placeholder="10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <div className="space-y-1">
                    <p>• Requires Xumm wallet installed</p>
                    <p>• Network fees apply</p>
                    <p>• Transaction will be recorded on XRP Ledger</p>
                  </div>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleXRPTip} 
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Send ${amount || '0'} XRP`
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                XRP Ledger (XRPL)
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Extend Window interface for Xumm
declare global {
  interface Window {
    xumm?: any;
  }
}
