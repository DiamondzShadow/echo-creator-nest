import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Coins, Loader2, Info } from 'lucide-react';
import { VIDEO_TIPPING_CONTRACT_ADDRESS, VIDEO_TIPPING_ABI } from '@/lib/web3-config';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VideoTipButtonProps {
  videoId: string;
  creatorUserId: string;
  creatorWalletAddress?: string | null;
  creatorUsername: string;
}

export const VideoTipButton = ({ 
  videoId, 
  creatorUserId, 
  creatorWalletAddress, 
  creatorUsername 
}: VideoTipButtonProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const { address, isConnected, chain } = useAccount();
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { toast } = useToast();

  // Normalize network name for backend
  const normalizeNetworkName = (chainName?: string): string => {
    if (!chainName) return 'ethereum';
    const normalized = chainName.toLowerCase().trim();
    // Map common chain name variations
    if (normalized.includes('polygon')) return 'polygon';
    if (normalized.includes('arbitrum')) return 'arbitrum';
    if (normalized.includes('optimism')) return 'optimism';
    if (normalized.includes('base')) return 'base';
    if (normalized.includes('ethereum') || normalized.includes('mainnet')) return 'ethereum';
    return normalized;
  };

  // Record tip after transaction is confirmed
  useEffect(() => {
    const recordTip = async () => {
      if (isSuccess && hash && !isRecording) {
        setIsRecording(true);
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast({
              title: "Authentication Error",
              description: "Please sign in to record your tip",
              variant: "destructive",
            });
            return;
          }

          const networkName = normalizeNetworkName(chain?.name);
          console.log('Recording video tip - Chain:', chain?.name, 'Normalized:', networkName, 'Chain ID:', chain?.id);

          // Call edge function to verify and record video tip
          const { data, error } = await supabase.functions.invoke('record-video-tip', {
            body: {
              video_id: videoId,
              to_user_id: creatorUserId,
              to_wallet_address: creatorWalletAddress,
              from_wallet_address: address,
              amount: parseEther(amount).toString(),
              network: networkName,
              transaction_hash: hash,
              metadata: {
                amount_display: amount,
                chain_id: chain?.id,
                chain_name: chain?.name,
              },
            },
          });

          if (error) {
            console.error('Error recording video tip:', error);
            toast({
              title: "Recording Failed",
              description: error.message || "Failed to verify and record tip. The transaction was successful but we couldn't verify it. Please contact support.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Tip Sent! 🎉",
              description: `Successfully tipped ${creatorUsername} for this video!`,
            });
            setOpen(false);
            setAmount('');
          }
        } catch (error) {
          console.error('Error recording video tip:', error);
          toast({
            title: "Recording Failed",
            description: error instanceof Error ? error.message : "Failed to verify and record tip",
            variant: "destructive",
          });
        } finally {
          setIsRecording(false);
        }
      }
    };

    recordTip();
  }, [isSuccess, hash, amount, chain, address, videoId, creatorUserId, creatorWalletAddress, creatorUsername, toast, isRecording]);

  const handleTip = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!creatorWalletAddress) {
      toast({
        title: "No Wallet Connected",
        description: `${creatorUsername} hasn't connected their wallet yet`,
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
      // Call VideoTipping contract - automatically handles platform and custom fees
      writeContract({
        address: VIDEO_TIPPING_CONTRACT_ADDRESS as `0x${string}`,
        abi: VIDEO_TIPPING_ABI,
        functionName: 'tipVideoWithNative',
        args: [videoId, creatorWalletAddress as `0x${string}`],
        value: parseEther(amount),
        account: address as `0x${string}`,
        chain,
      });

      toast({
        title: "Transaction Sent",
        description: "Waiting for confirmation...",
      });
    } catch (error) {
      console.error('Video tip error:', error);
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to send tip",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Coins className="w-4 h-4" />
          Tip Video
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tip {creatorUsername}</DialogTitle>
          <DialogDescription>
            Support this creator directly for this amazing video
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!creatorWalletAddress ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {creatorUsername} hasn't connected their wallet yet
              </AlertDescription>
            </Alert>
          ) : !isConnected ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Connect your wallet to send tips
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div>
                <Label htmlFor="amount">Amount (ETH)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  placeholder="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <div className="space-y-1">
                    <p>• Platform fee applies (supports the platform)</p>
                    <p>• Creator may have custom fee settings for this video</p>
                    <p>• Fees are automatically calculated on-chain</p>
                  </div>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleTip} 
                disabled={isConfirming || isRecording || !amount || parseFloat(amount) <= 0}
                className="w-full"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : isRecording ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  `Send ${amount || '0'} ETH`
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
