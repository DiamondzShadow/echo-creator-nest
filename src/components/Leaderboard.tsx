import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LeaderboardUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_tips_received: number;
  tip_count: number;
  theme_color: string | null;
}

const Leaderboard = () => {
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, total_tips_received, tip_count, theme_color')
        .order('total_tips_received', { ascending: false })
        .limit(10);

      if (!error && data) {
        setTopUsers(data);
      }
      setLoading(false);
    };

    fetchTopUsers();
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-700" />;
      default:
        return <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  if (loading) {
    return null;
  }

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Top Creators Leaderboard
          </h2>
          <p className="text-muted-foreground text-lg">
            Our most supported creators this month
          </p>
        </div>

        <Card className="border-0 shadow-glow bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-center text-2xl">🏆 Hall of Fame</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topUsers.map((user, index) => (
              <Link
                key={user.id}
                to={`/profile/${user.id}`}
                className="block"
              >
                <div className="flex items-center gap-4 p-4 rounded-lg bg-card hover:bg-accent/50 transition-all hover:scale-[1.02] border border-border">
                  <div className="flex items-center justify-center w-12">
                    {getRankIcon(index)}
                  </div>
                  
                  <Avatar 
                    className="w-14 h-14 ring-2"
                    style={{
                      borderColor: user.theme_color || 'hsl(var(--primary))',
                    }}
                  >
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback 
                      className="text-lg font-bold text-white"
                      style={{
                        backgroundColor: user.theme_color || 'hsl(var(--primary))',
                      }}
                    >
                      {user.display_name?.[0]?.toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{user.display_name || user.username}</h3>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {user.tip_count}
                    </p>
                    <p className="text-xs text-muted-foreground">tips received</p>
                  </div>
                </div>
              </Link>
            ))}

            {topUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tips yet. Be the first to support a creator!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Leaderboard;
