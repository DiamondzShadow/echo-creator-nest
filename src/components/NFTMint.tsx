import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ImagePlus, Upload } from 'lucide-react';
import { CREATOR_NFT_CONTRACT_ADDRESS, CREATOR_NFT_ABI } from '@/lib/web3-config';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export const NFTMint = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [royaltyPercentage, setRoyaltyPercentage] = useState('10');
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { toast } = useToast();

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // For now, use a placeholder or integrate with IPFS/Storj
      // In production, upload to IPFS or Storj
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // TODO: Upload to IPFS/Storj and get the URL
      toast({
        title: "Image Uploaded",
        description: "Image preview loaded. In production, this will upload to IPFS.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleMint = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!name || !description || !imageUrl) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const royalty = parseFloat(royaltyPercentage);
    if (isNaN(royalty) || royalty < 0 || royalty > 30) {
      toast({
        title: "Invalid Royalty",
        description: "Royalty must be between 0% and 30%",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create metadata object
      const metadata: NFTMetadata = {
        name,
        description,
        image: imageUrl,
      };

      // TODO: Upload metadata to IPFS and get URI
      // For now, use a placeholder URI
      const metadataUri = `ipfs://placeholder/${Date.now()}`;
      
      // Convert royalty percentage to basis points (10% = 1000)
      const royaltyBasisPoints = Math.floor(royalty * 100);

      // Mint NFT (requires minting fee)
      writeContract({
        address: CREATOR_NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: CREATOR_NFT_ABI,
        functionName: 'mintNFT',
        args: [address, metadataUri, BigInt(royaltyBasisPoints)],
        value: parseEther('0.001'), // Minting fee
      });

      toast({
        title: "Minting NFT",
        description: "Transaction sent, waiting for confirmation...",
      });
    } catch (error) {
      console.error('Mint error:', error);
      toast({
        title: "Minting Failed",
        description: error instanceof Error ? error.message : "Failed to mint NFT",
        variant: "destructive",
      });
    }
  };

  // Reset form on success
  if (isSuccess && hash) {
    setTimeout(() => {
      setName('');
      setDescription('');
      setImageUrl('');
      setRoyaltyPercentage('10');
      setImagePreview(null);
      
      toast({
        title: "NFT Minted! 🎉",
        description: "Your NFT has been successfully minted and can now be listed on the marketplace.",
      });
    }, 1000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="w-5 h-5" />
          Mint Your NFT
        </CardTitle>
        <CardDescription>
          Create and mint your own NFT with customizable royalties (up to 30%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Please connect your wallet to mint NFTs
            </p>
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="nft-name">NFT Name *</Label>
              <Input
                id="nft-name"
                placeholder="My Awesome NFT"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="nft-description">Description *</Label>
              <Textarea
                id="nft-description"
                placeholder="Describe your NFT..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="nft-image">Image URL *</Label>
              <Input
                id="nft-image"
                placeholder="https://... or ipfs://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Or upload an image (will be stored on IPFS)
              </p>
            </div>

            <div>
              <Label htmlFor="image-upload">Upload Image</Label>
              <div className="mt-2">
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  disabled={isUploading}
                />
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-xs rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="royalty">Royalty Percentage (0-30%)</Label>
              <Input
                id="royalty"
                type="number"
                min="0"
                max="30"
                step="0.5"
                value={royaltyPercentage}
                onChange={(e) => setRoyaltyPercentage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                You'll earn {royaltyPercentage}% from all future sales of this NFT
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minting Fee:</span>
                <span className="font-medium">0.001 ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Royalty on Sales:</span>
                <span className="font-medium">{royaltyPercentage}%</span>
              </div>
            </div>

            <Button
              onClick={handleMint}
              disabled={isConfirming || isUploading || !name || !description || !imageUrl}
              className="w-full"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Minting...
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading Image...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Mint NFT (0.001 ETH)
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
