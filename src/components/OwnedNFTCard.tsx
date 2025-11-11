import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, Image as ImageIcon } from 'lucide-react';
import { NFTListDialog } from './NFTListDialog';
import { OpenSeaLinkButton } from './OpenSeaLinkButton';
import { CREATOR_NFT_CONTRACT_ADDRESS } from '@/lib/web3-config';
import { formatImageUrl } from '@/lib/nft-metadata';

interface OwnedNFTCardProps {
  tokenId: number;
  name: string;
  description?: string;
  imageUrl: string;
  isListed?: boolean;
  onListSuccess?: () => void;
}

export const OwnedNFTCard = ({
  tokenId,
  name,
  description,
  imageUrl,
  isListed = false,
  onListSuccess,
}: OwnedNFTCardProps) => {
  const [showListDialog, setShowListDialog] = useState(false);

  return (
    <>
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
            <Badge className="absolute top-2 right-2" variant="default">
              Owned
            </Badge>
            {isListed && (
              <Badge className="absolute top-2 left-2" variant="secondary">
                Listed
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg truncate">{name}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Token ID: #{tokenId}</p>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          <Button 
            className="w-full" 
            onClick={() => setShowListDialog(true)}
            disabled={isListed}
          >
            {isListed ? (
              'Already Listed'
            ) : (
              <>
                <Tag className="w-4 h-4 mr-2" />
                List for Sale
              </>
            )}
          </Button>
          <OpenSeaLinkButton
            contractAddress={CREATOR_NFT_CONTRACT_ADDRESS}
            tokenId={tokenId}
            chain="arbitrum"
            variant="ghost"
            size="sm"
            className="w-full"
          />
        </CardFooter>
      </Card>

      <NFTListDialog
        open={showListDialog}
        onOpenChange={setShowListDialog}
        tokenId={tokenId}
        name={name}
        imageUrl={imageUrl}
        onListSuccess={onListSuccess}
      />
    </>
  );
};
