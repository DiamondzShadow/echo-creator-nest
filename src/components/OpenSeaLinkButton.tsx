import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { getOpenSeaURL } from '@/lib/opensea';

interface OpenSeaLinkButtonProps {
  contractAddress: string;
  tokenId: string | number;
  chain?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function OpenSeaLinkButton({
  contractAddress,
  tokenId,
  chain = 'arbitrum',
  variant = 'outline',
  size = 'sm',
  className = '',
}: OpenSeaLinkButtonProps) {
  const openSeaUrl = getOpenSeaURL(contractAddress, tokenId, chain);

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => window.open(openSeaUrl, '_blank')}
    >
      <ExternalLink className="w-4 h-4 mr-2" />
      View on OpenSea
    </Button>
  );
}
