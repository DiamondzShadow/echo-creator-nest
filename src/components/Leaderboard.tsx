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
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Top Creators Leaderboard
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg px-4">
            Our most supported creators this month
          </p>
        </div>

        <Card className="border-0 shadow-glow bg-gradient-card">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-center text-xl sm:text-2xl">🏆 Hall of Fame</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-4">
            {topUsers.map((user, index) => (
              <Link
                key={user.id}
                to={`/profile/${user.id}`}
                className="block"
              >
                <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-card hover:bg-accent/50 transition-all hover:scale-[1.02] border border-border">
                  <div className="flex items-center justify-center w-8 sm:w-12 flex-shrink-0">
                    {getRankIcon(index)}
                  </div>
                  
                  <Avatar 
                    className="w-10 h-10 sm:w-14 sm:h-14 ring-2 flex-shrink-0"
                    style={{
                      borderColor: user.theme_color || 'hsl(var(--primary))',
                    }}
                  >
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback 
                      className="text-sm sm:text-lg font-bold text-white"
                      style={{
                        backgroundColor: user.theme_color || 'hsl(var(--primary))',
                      }}
                    >
                      {user.display_name?.[0]?.toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-lg truncate">{user.display_name || user.username}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">@{user.username}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-lg sm:text-2xl font-bold text-primary">
                      {user.tip_count}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">tips received</p>
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
