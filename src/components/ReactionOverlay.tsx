import { useEffect, useRef, useState } from 'react';
import { ReactionType } from '@/components/StreamReactions';

interface OverlayItem {
  id: string;
  emoji: string;
  x: number;
  y: number;
  life: number; // ms remaining
}

const EMOJI_BY_REACTION: Record<ReactionType, string> = {
  like: '👍',
  unlike: '👎',
  love: '❤️',
  what: '🤔',
  lmao: '🤣',
};

interface ReactionOverlayProps {
  width?: number;
  height?: number;
}

export const ReactionOverlay = ({ width = 1280, height = 720 }: ReactionOverlayProps) => {
  const [items, setItems] = useState<OverlayItem[]>([]);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    // Start animation loop
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last; // ms
      last = now;
      setItems((prev) =>
        prev
          .map((i) => ({ ...i, y: i.y - dt * 0.05, life: i.life - dt }))
          .filter((i) => i.life > 0)
      );
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Public method via DOM event to spawn reaction bubbles, so parents don't need refs
  useEffect(() => {
    const handler = (e: CustomEvent<{ reaction: ReactionType }>) => {
      const emoji = EMOJI_BY_REACTION[e.detail.reaction];
      if (!emoji) return;
      const id = crypto.randomUUID();
      const x = 40 + Math.random() * (width - 80);
      const y = height - 40;
      const life = 2500 + Math.random() * 1000;
      setItems((prev) => [...prev, { id, emoji, x, y, life }]);
    };
    window.addEventListener('reaction:add', handler as EventListener);
    return () => window.removeEventListener('reaction:add', handler as EventListener);
  }, [width, height]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((i) => (
        <div
          key={i.id}
          className="absolute select-none text-2xl will-change-transform"
          style={{
            transform: `translate(${i.x}px, ${i.y}px)`,
            opacity: Math.max(0, Math.min(1, i.life / 800)),
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
          }}
        >
          {i.emoji}
        </div>
      ))}
    </div>
  );
};

export default ReactionOverlay;
