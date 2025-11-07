import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Tip {
  id: string;
  amount: string;
  token_symbol: string;
  network: string;
  transaction_hash: string;
  created_at: string;
  from_user_id: string | null;
  to_user_id: string;
  from_wallet_address: string;
  to_wallet_address: string;
}

interface TransactionHistoryProps {
  userId: string;
}

export const TransactionHistory = ({ userId }: TransactionHistoryProps) => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching tips:', error);
    } else {
      setTips(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTips();

    // Set up realtime subscription
    const channel = supabase
      .channel('tips-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tips',
          filter: `or(from_user_id=eq.${userId},to_user_id=eq.${userId})`,
        },
        () => {
          fetchTips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getBlockExplorerUrl = (network: string, hash: string) => {
    const explorers: Record<string, string> = {
      ethereum: `https://etherscan.io/tx/${hash}`,
      polygon: `https://polygonscan.com/tx/${hash}`,
      base: `https://basescan.org/tx/${hash}`,
      arbitrum: `https://arbiscan.io/tx/${hash}`,
      optimism: `https://optimistic.etherscan.io/tx/${hash}`,
      solana: `https://solscan.io/tx/${hash}`,
      xrp: `https://xrpscan.com/tx/${hash}`,
    };
    return explorers[network.toLowerCase()] || '#';
  };

  const getNetworkColor = (network: string) => {
    const colors: Record<string, string> = {
      ethereum: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      polygon: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      base: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      arbitrum: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      optimism: 'bg-red-500/20 text-red-400 border-red-500/30',
      solana: 'bg-green-500/20 text-green-400 border-green-500/30',
      xrp: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
    return colors[network.toLowerCase()] || 'bg-secondary';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent tips across all chains</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent tips across all chains</CardDescription>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={fetchTips}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {tips.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions yet
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {tips.map((tip) => {
                const isReceived = tip.to_user_id === userId;
                const isXRP = tip.network.toLowerCase() === 'xrp';
                
                return (
                  <div
                    key={tip.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isReceived ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                        {isReceived ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-400" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-orange-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {isReceived ? 'Received' : 'Sent'}
                          </span>
                          <Badge variant="outline" className={getNetworkColor(tip.network)}>
                            {tip.network.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(tip.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold">
                          {isReceived ? '+' : '-'}{tip.amount} {tip.token_symbol}
                        </div>
                        {isXRP && (
                          <div className="text-xs text-muted-foreground">
                            {tip.from_wallet_address.slice(0, 6)}...{tip.from_wallet_address.slice(-4)}
                          </div>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        asChild
                        className="h-8 w-8"
                      >
                        <a
                          href={getBlockExplorerUrl(tip.network, tip.transaction_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
