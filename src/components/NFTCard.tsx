import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { arbitrum } from 'wagmi/chains';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, ShoppingCart, Tag, User } from 'lucide-react';
import { NFT_MARKETPLACE_CONTRACT_ADDRESS, NFT_MARKETPLACE_ABI, CREATOR_NFT_CONTRACT_ADDRESS } from '@/lib/web3-config';
import { OpenSeaLinkButton } from './OpenSeaLinkButton';
import { formatImageUrl } from '@/lib/nft-metadata';

interface NFTCardProps {
  listingId: number;
  tokenId: number;
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  paymentTokenSymbol?: string;
  seller: string;
  sellerAddress: string;
  royaltyPercentage?: number;
  platformFee?: number;
  isActive: boolean;
  isOwnNFT?: boolean;
  onPurchaseSuccess?: () => void;
}

export const NFTCard = ({
  listingId,
  tokenId,
  name,
  description,
  imageUrl,
  price,
  paymentTokenSymbol = 'ETH',
  seller,
  sellerAddress,
  royaltyPercentage = 0,
  platformFee = 2.5,
  isActive,
  isOwnNFT = false,
  onPurchaseSuccess,
}: NFTCardProps) => {
  const [open, setOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { toast } = useToast();

  const calculateBreakdown = () => {
    const total = parseFloat(price);
    const platformFeeAmount = (total * platformFee) / 100;
    const royaltyAmount = (total * royaltyPercentage) / 100;
    const sellerAmount = total - platformFeeAmount - royaltyAmount;
    
    return {
      total,
      platformFeeAmount: platformFeeAmount.toFixed(6),
      royaltyAmount: royaltyAmount.toFixed(6),
      sellerAmount: sellerAmount.toFixed(6),
    };
  };

  const handleBuy = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (isOwnNFT) {
      toast({
        title: "Cannot Buy",
        description: "You cannot buy your own NFT",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!address) return;
      
      writeContract({
        address: NFT_MARKETPLACE_CONTRACT_ADDRESS as `0x${string}`,
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'buyNFT',
        args: [BigInt(listingId)],
        value: parseEther(price),
        account: address,
        chain: arbitrum,
      });

      toast({
        title: "Purchase Initiated",
        description: "Transaction sent, waiting for confirmation...",
      });
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Failed to purchase NFT",
        variant: "destructive",
      });
    }
  };

  // Handle successful purchase
  if (isSuccess && hash) {
    setTimeout(() => {
      toast({
        title: "NFT Purchased! 🎉",
        description: "You are now the owner of this NFT",
      });
      setOpen(false);
      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }
    }, 1000);
  }

  const breakdown = calculateBreakdown();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={formatImageUrl(imageUrl) || '/placeholder.svg'}
            alt={name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          {!isActive && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Badge variant="secondary">Sold</Badge>
            </div>
          )}
          {isOwnNFT && isActive && (
            <Badge className="absolute top-2 right-2" variant="default">
              Your NFT
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="truncate">{seller}</span>
          </div>
          
          <div className="flex items-baseline gap-2">
            <Tag className="w-4 h-4" />
            <span className="text-2xl font-bold">{price}</span>
            <span className="text-sm text-muted-foreground">{paymentTokenSymbol}</span>
          </div>
          
          {royaltyPercentage > 0 && (
            <Badge variant="outline" className="w-fit">
              {royaltyPercentage}% Royalty
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
        {isActive ? (
          <>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" disabled={isOwnNFT}>
                  {isOwnNFT ? 'Your NFT' : 'Buy Now'}
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Purchase NFT</DialogTitle>
                <DialogDescription>
                  Review the details before completing your purchase
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={formatImageUrl(imageUrl) || '/placeholder.svg'}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg">{name}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-medium">{price} {paymentTokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee ({platformFee}%):</span>
                    <span className="font-medium">{breakdown.platformFeeAmount} {paymentTokenSymbol}</span>
                  </div>
                  {royaltyPercentage > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Creator Royalty ({royaltyPercentage}%):</span>
                      <span className="font-medium">{breakdown.royaltyAmount} {paymentTokenSymbol}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{price} {paymentTokenSymbol}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Seller Receives:</span>
                    <span>{breakdown.sellerAmount} {paymentTokenSymbol}</span>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>Seller: {seller}</p>
                  <p className="truncate">Address: {sellerAddress}</p>
                  <p>Token ID: #{tokenId}</p>
                </div>
                
                <Button
                  onClick={handleBuy}
                  disabled={isConfirming || !isConnected}
                  className="w-full"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirming Purchase...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Buy for {price} {paymentTokenSymbol}
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`https://etherscan.io/address/${sellerAddress}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Seller on Explorer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <OpenSeaLinkButton
            contractAddress={CREATOR_NFT_CONTRACT_ADDRESS}
            tokenId={tokenId}
            chain="arbitrum"
            variant="ghost"
            size="sm"
            className="w-full"
          />
          </>
        ) : (
          <>
            <Button variant="outline" disabled className="w-full">
              Sold
            </Button>
            <OpenSeaLinkButton
              contractAddress={CREATOR_NFT_CONTRACT_ADDRESS}
              tokenId={tokenId}
              chain="arbitrum"
              variant="ghost"
              size="sm"
              className="w-full"
            />
          </>
        )}
      </CardFooter>
    </Card>
  );
};
