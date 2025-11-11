import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { arbitrum } from 'wagmi/chains';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Tag, Clock, Info } from 'lucide-react';
import { NFT_MARKETPLACE_CONTRACT_ADDRESS, NFT_MARKETPLACE_ABI, CREATOR_NFT_CONTRACT_ADDRESS, CREATOR_NFT_ABI } from '@/lib/web3-config';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NFTListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenId: number;
  name: string;
  imageUrl: string;
  onListSuccess?: () => void;
}

export const NFTListDialog = ({
  open,
  onOpenChange,
  tokenId,
  name,
  imageUrl,
  onListSuccess,
}: NFTListDialogProps) => {
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('90'); // days
  const [step, setStep] = useState<'approve' | 'list'>('approve');
  
  const { address } = useAccount();
  const { toast } = useToast();
  
  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { writeContract: writeList, data: listHash } = useWriteContract();
  
  const { isLoading: isApprovePending } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isListPending, isSuccess: isListSuccess } = useWaitForTransactionReceipt({ hash: listHash });

  const handleApprove = async () => {
    if (!address) return;

    try {
      writeApprove({
        address: CREATOR_NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: CREATOR_NFT_ABI,
        functionName: 'approve',
        args: [NFT_MARKETPLACE_CONTRACT_ADDRESS as `0x${string}`, BigInt(tokenId)],
        account: address,
        chain: arbitrum,
      });

      toast({
        title: "Approval Requested",
        description: "Please confirm the transaction in your wallet...",
      });
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve NFT",
        variant: "destructive",
      });
    }
  };

  const handleList = async () => {
    if (!address || !price) return;

    const priceWei = parseEther(price);
    const durationSeconds = BigInt(Number(duration) * 24 * 60 * 60); // Convert days to seconds
    
    try {
      writeList({
        address: NFT_MARKETPLACE_CONTRACT_ADDRESS as `0x${string}`,
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'listNFT',
        args: [
          CREATOR_NFT_CONTRACT_ADDRESS as `0x${string}`,
          BigInt(tokenId),
          priceWei,
          '0x0000000000000000000000000000000000000000', // ETH payment
          durationSeconds,
        ],
        account: address,
        chain: arbitrum,
      });

      toast({
        title: "Listing NFT",
        description: "Please confirm the transaction in your wallet...",
      });
    } catch (error) {
      console.error('Listing error:', error);
      toast({
        title: "Listing Failed",
        description: error instanceof Error ? error.message : "Failed to list NFT",
        variant: "destructive",
      });
    }
  };

  // Handle successful approval
  if (approveHash && !isApprovePending && step === 'approve') {
    setStep('list');
    toast({
      title: "Approval Confirmed",
      description: "Now you can list your NFT for sale",
    });
  }

  // Handle successful listing
  if (isListSuccess && listHash) {
    setTimeout(() => {
      toast({
        title: "NFT Listed! 🎉",
        description: "Your NFT is now available in the marketplace",
      });
      onOpenChange(false);
      setPrice('');
      setDuration('90');
      setStep('approve');
      if (onListSuccess) {
        onListSuccess();
      }
    }, 1000);
  }

  const calculateBreakdown = () => {
    if (!price) return null;
    const total = parseFloat(price);
    const platformFee = total * 0.025; // 2.5%
    const sellerReceives = total - platformFee;
    return { total, platformFee, sellerReceives };
  };

  const breakdown = calculateBreakdown();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>List NFT for Sale</DialogTitle>
          <DialogDescription>
            Set a price and duration for your NFT listing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
            <img
              src={imageUrl || '/placeholder.svg'}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          </div>

          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-sm text-muted-foreground">Token ID: #{tokenId}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (ETH)</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="price"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Listing Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days (default)</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {breakdown && (
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">List Price:</span>
                <span className="font-medium">{price} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee (2.5%):</span>
                <span className="font-medium">{breakdown.platformFee.toFixed(6)} ETH</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>You Receive:</span>
                <span className="text-primary">{breakdown.sellerReceives.toFixed(6)} ETH</span>
              </div>
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {step === 'approve' 
                ? 'First, approve the marketplace to transfer your NFT. Then set your listing price.'
                : 'Your NFT will be listed for sale and can be purchased by anyone.'}
            </AlertDescription>
          </Alert>

          {step === 'approve' ? (
            <Button
              onClick={handleApprove}
              disabled={isApprovePending}
              className="w-full"
            >
              {isApprovePending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4 mr-2" />
                  Approve NFT Transfer
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleList}
              disabled={!price || parseFloat(price) <= 0 || isListPending}
              className="w-full"
            >
              {isListPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Listing NFT...
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4 mr-2" />
                  List for Sale
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
