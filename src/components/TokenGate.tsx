import { ReactNode, useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { PLATFORM_TOKEN_ADDRESSES, TOKEN_GATE_THRESHOLDS } from '@/lib/web3-config';

// ERC-20 ABI for balanceOf
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface TokenGateProps {
  children: ReactNode;
  requiredBalance?: bigint;
  fallback?: ReactNode;
  gateType?: 'PREMIUM_CONTENT' | 'EXCLUSIVE_STREAMS' | 'VIP_ACCESS';
}

export const TokenGate = ({ 
  children, 
  requiredBalance, 
  fallback,
  gateType = 'PREMIUM_CONTENT' 
}: TokenGateProps) => {
  const { address, isConnected, chain } = useAccount();
  const [hasAccess, setHasAccess] = useState(false);

  const threshold = requiredBalance || TOKEN_GATE_THRESHOLDS[gateType];
  
  // Get token address for current chain
  const tokenAddress = chain?.id === 1 
    ? PLATFORM_TOKEN_ADDRESSES.mainnet 
    : chain?.id === 137
    ? PLATFORM_TOKEN_ADDRESSES.polygon
    : chain?.id === 8453
    ? PLATFORM_TOKEN_ADDRESSES.base
    : PLATFORM_TOKEN_ADDRESSES.polygon; // Default to polygon

  const { data: balance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && !!tokenAddress,
    },
  });

  useEffect(() => {
    if (balance !== undefined) {
      setHasAccess(balance >= threshold);
    }
  }, [balance, threshold]);

  if (!isConnected || !hasAccess) {
    return (
      fallback || (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Premium Content Locked
            </CardTitle>
            <CardDescription>
              This content requires holding platform tokens to access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Required balance: {(Number(threshold) / 10 ** 18).toLocaleString()} tokens
            </p>
            {balance !== undefined && (
              <p className="text-sm text-muted-foreground mt-2">
                Your balance: {(Number(balance) / 10 ** 18).toLocaleString()} tokens
              </p>
            )}
          </CardContent>
        </Card>
      )
    );
  }

  return <>{children}</>;
};
