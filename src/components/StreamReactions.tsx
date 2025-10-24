import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export type ReactionType = 'like' | 'unlike' | 'love' | 'what' | 'lmao';

const REACTIONS: { key: ReactionType; label: string; emoji: string }[] = [
  { key: 'like', label: 'Like', emoji: '👍' },
  { key: 'unlike', label: 'Unlike', emoji: '👎' },
  { key: 'love', label: 'Love', emoji: '❤️' },
  { key: 'what', label: 'What?', emoji: '🤔' },
  { key: 'lmao', label: 'LMAO', emoji: '🤣' },
];

interface StreamReactionsProps {
  streamId: string;
  currentUserId?: string;
  onReact?: (reaction: ReactionType) => void;
}

export const StreamReactions = ({ streamId, currentUserId, onReact }: StreamReactionsProps) => {
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    like: 0,
    unlike: 0,
    love: 0,
    what: 0,
    lmao: 0,
  });
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!streamId) return;
    fetchCountsAndMine();

    const channel = supabase
      .channel(`stream_reactions_${streamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stream_reactions', filter: `stream_id=eq.${streamId}` },
        () => {
          // Recompute counts on any change
          fetchCountsAndMine(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, currentUserId]);

  const fetchCountsAndMine = async (setLoadingState: boolean = true) => {
    try {
      if (setLoadingState) setLoading(true);

      const { data: all } = await supabase
        .from('stream_reactions')
        .select('reaction, user_id')
        .eq('stream_id', streamId);

      const nextCounts: Record<ReactionType, number> = {
        like: 0,
        unlike: 0,
        love: 0,
        what: 0,
        lmao: 0,
      };
      let mine: ReactionType | null = null;

      for (const row of all || []) {
        const r = (row.reaction as ReactionType) || 'like';
        if (nextCounts[r] !== undefined) nextCounts[r] += 1;
        if (row.user_id === currentUserId) mine = r;
      }

      setCounts(nextCounts);
      setMyReaction(mine);
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    } finally {
      if (setLoadingState) setLoading(false);
    }
  };

  const handleReact = async (reaction: ReactionType) => {
    if (!currentUserId) {
      toast({ title: 'Sign in required', description: 'Sign in to react', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);

      // Toggle off if same reaction clicked
      if (myReaction === reaction) {
        const { error } = await supabase
          .from('stream_reactions')
          .delete()
          .eq('stream_id', streamId)
          .eq('user_id', currentUserId);
        if (error) throw error;
        setMyReaction(null);
        onReact?.(reaction);
        return;
      }

      // Upsert single row per (stream, user)
      const { error } = await supabase
        .from('stream_reactions')
        .upsert(
          { stream_id: streamId, user_id: currentUserId, reaction },
          { onConflict: 'stream_id,user_id' }
        );
      if (error) throw error;

      setMyReaction(reaction);
      onReact?.(reaction);
    } catch (error) {
      console.error('Failed to react:', error);
      toast({ title: 'Reaction failed', description: error instanceof Error ? error.message : 'An error occurred', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const buttons = useMemo(
    () => (
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map(({ key, label, emoji }) => {
          const isActive = myReaction === key;
          return (
            <Button
              key={key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleReact(key)}
              disabled={loading}
              className={isActive ? 'shadow-glow' : ''}
            >
              <span className="mr-2" aria-hidden>
                {emoji}
              </span>
              {counts[key]}
            </Button>
          );
        })}
      </div>
    ),
    [counts, myReaction, loading]
  );

  return (
    <Card className="border-0 shadow-card p-3">
      {buttons}
    </Card>
  );
};

export default StreamReactions;
