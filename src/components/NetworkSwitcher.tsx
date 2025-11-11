import { useSwitchChain, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Check, Hexagon, Triangle, Circle, Square, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const NETWORK_CONFIG = {
  1: { name: 'Ethereum', icon: Hexagon, color: 'text-blue-500' },
  137: { name: 'Polygon', icon: Triangle, color: 'text-purple-500' },
  8453: { name: 'Base', icon: Circle, color: 'text-blue-400' },
  42161: { name: 'Arbitrum', icon: Square, color: 'text-blue-600' },
  10: { name: 'Optimism', icon: Layers, color: 'text-red-500' },
  3141: { name: 'Filecoin', icon: Circle, color: 'text-cyan-500' },
} as const;

export const NetworkSwitcher = () => {
  const { chains, switchChain } = useSwitchChain();
  const chainId = useChainId();
  const { toast } = useToast();

  const currentNetwork = NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG];
  const CurrentIcon = currentNetwork?.icon || Hexagon;

  const handleNetworkSwitch = (targetChainId: number) => {
    try {
      switchChain({ chainId: targetChainId });
      const targetNetwork = NETWORK_CONFIG[targetChainId as keyof typeof NETWORK_CONFIG];
      toast({
        title: 'Network switched',
        description: `Switched to ${targetNetwork.name}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to switch network',
        variant: 'destructive',
      });
    }
  };

  if (!currentNetwork) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CurrentIcon className={`h-4 w-4 ${currentNetwork.color}`} />
          <span className="hidden sm:inline">{currentNetwork.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-card border-border z-50"
      >
        {chains.map((chain) => {
          const network = NETWORK_CONFIG[chain.id as keyof typeof NETWORK_CONFIG];
          if (!network) return null;
          
          const NetworkIcon = network.icon;
          const isActive = chain.id === chainId;

          return (
            <DropdownMenuItem
              key={chain.id}
              onClick={() => handleNetworkSwitch(chain.id)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <NetworkIcon className={`h-4 w-4 ${network.color}`} />
              <span className="flex-1">{network.name}</span>
              {isActive && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
