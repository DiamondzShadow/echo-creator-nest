import { useBalance, useAccount, useChainId } from 'wagmi';
import { mainnet, polygon, base, arbitrum, optimism } from 'wagmi/chains';

export const useEVMBalance = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  
  const { data, isLoading, error, refetch } = useBalance({
    address: address,
  });

  // Get chain-specific symbol
  const getChainSymbol = () => {
    switch (chainId) {
      case mainnet.id:
        return 'ETH';
      case polygon.id:
        return 'MATIC';
      case base.id:
        return 'ETH';
      case arbitrum.id:
        return 'ETH';
      case optimism.id:
        return 'ETH';
      default:
        return 'ETH';
    }
  };

  const getChainName = () => {
    switch (chainId) {
      case mainnet.id:
        return 'Ethereum';
      case polygon.id:
        return 'Polygon';
      case base.id:
        return 'Base';
      case arbitrum.id:
        return 'Arbitrum';
      case optimism.id:
        return 'Optimism';
      default:
        return 'Unknown';
    }
  };

  return {
    balance: data?.formatted ? parseFloat(data.formatted).toFixed(4) : null,
    symbol: getChainSymbol(),
    chainName: getChainName(),
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
};
