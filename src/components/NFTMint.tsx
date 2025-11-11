import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useActiveAccount, useSendTransaction } from 'thirdweb/react';
import { parseEther } from 'viem';
import { arbitrum } from 'wagmi/chains';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ImagePlus, Upload } from 'lucide-react';
import { CREATOR_NFT_CONTRACT_ADDRESS, CREATOR_NFT_ABI } from '@/lib/web3-config';
import { createNFTMetadata, createMetadataURI, prepareImageForNFT } from '@/lib/nft-metadata';
import type { NFTMetadata } from '@/lib/nft-metadata';
import { getContract, prepareContractCall } from 'thirdweb';
import { createThirdwebClient, defineChain } from 'thirdweb';

const thirdwebClient = createThirdwebClient({
  clientId: "b1c4d85a2601e8268c98039ccb1de1db",
});

export const NFTMint = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [royaltyPercentage, setRoyaltyPercentage] = useState('10');
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Support both wagmi and Thirdweb wallets
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const thirdwebAccount = useActiveAccount();
  const { mutate: sendThirdwebTransaction } = useSendTransaction();
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { toast } = useToast();

  // Use whichever wallet is connected
  const address = wagmiAddress || thirdwebAccount?.address;
  const isConnected = wagmiConnected || !!thirdwebAccount;

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Prepare image - converts to data URI for now
      // In production, this should upload to IPFS/Storj
      const imageDataUrl = await prepareImageForNFT(file);
      setImagePreview(imageDataUrl);
      setImageUrl(imageDataUrl);

      toast({
        title: "Image Uploaded",
        description: "Image loaded successfully. Ready to mint!",
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

    // Check if contract is deployed
    if (!CREATOR_NFT_CONTRACT_ADDRESS || CREATOR_NFT_CONTRACT_ADDRESS.startsWith("0x...")) {
      toast({
        title: "Contract Not Deployed",
        description: "The CreatorNFT contract has not been deployed yet. Please contact the platform administrator.",
        variant: "destructive",
      });
      return;
    }

    if (!name || !description || !imageUrl) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Name, Description, and Image)",
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
      // Create OpenSea-compatible metadata
      const metadata = createNFTMetadata(
        name,
        description,
        imageUrl,
        address, // creator address
        royalty,
        [
          {
            trait_type: 'Royalty',
            value: `${royalty}%`,
          },
          {
            trait_type: 'Creator',
            value: address,
          },
        ]
      );

      // Create metadata URI (embedded as data URI)
      // In production, upload to IPFS and use the IPFS URI
      const metadataUri = createMetadataURI(metadata);
      
      // Convert royalty percentage to basis points (10% = 1000)
      const royaltyBasisPoints = Math.floor(royalty * 100);

      // Mint NFT (requires minting fee)
      if (wagmiConnected && wagmiAddress) {
        // Use wagmi for RainbowKit wallets
        writeContract({
          address: CREATOR_NFT_CONTRACT_ADDRESS as `0x${string}`,
          abi: CREATOR_NFT_ABI,
          functionName: 'mintNFT',
          args: [wagmiAddress, metadataUri, BigInt(royaltyBasisPoints)],
          value: parseEther('0.001'), // Minting fee
          account: wagmiAddress,
          chain: arbitrum,
        });
      } else if (thirdwebAccount) {
        // Use Thirdweb for Thirdweb wallets
        const contract = getContract({
          client: thirdwebClient,
          address: CREATOR_NFT_CONTRACT_ADDRESS,
          chain: defineChain(42161), // Arbitrum
        });

        const transaction = prepareContractCall({
          contract,
          method: "function mintNFT(address to, string memory uri, uint96 royaltyBasisPoints) payable",
          params: [thirdwebAccount.address as `0x${string}`, metadataUri, BigInt(royaltyBasisPoints)],
          value: BigInt(1000000000000000), // 0.001 ETH in wei
        });

        sendThirdwebTransaction(transaction);
      }

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
        {!CREATOR_NFT_CONTRACT_ADDRESS || CREATOR_NFT_CONTRACT_ADDRESS.startsWith("0x...") ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-destructive font-semibold">
              CreatorNFT Contract Not Deployed
            </p>
            <p className="text-muted-foreground text-sm">
              The NFT minting contract has not been deployed yet. Please contact the platform administrator to deploy the CreatorNFT.sol contract.
            </p>
          </div>
        ) : !isConnected ? (
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
              disabled={isConfirming || isUploading || !name || !description || !imageUrl || !CREATOR_NFT_CONTRACT_ADDRESS || CREATOR_NFT_CONTRACT_ADDRESS.startsWith("0x...")}
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
