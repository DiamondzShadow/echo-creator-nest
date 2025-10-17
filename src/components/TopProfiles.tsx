import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  following_count: number;
  theme_color: string | null;
}

const TopProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, follower_count, following_count, theme_color')
        .order('follower_count', { ascending: false })
        .limit(6);

      if (!error && data) {
        setProfiles(data);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Featured Creators
          </h2>
          <p className="text-muted-foreground text-lg">
            Join our community of amazing content creators
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {profiles.map((profile) => (
            <Link key={profile.id} to={`/profile/${profile.id}`}>
              <Card className="border shadow-card hover:shadow-glow transition-all hover:scale-[1.03] cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar 
                      className="w-20 h-20 mb-4 ring-4"
                      style={{
                        borderColor: profile.theme_color || 'hsl(var(--primary))',
                      }}
                    >
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback 
                        className="text-2xl text-white font-bold"
                        style={{
                          backgroundColor: profile.theme_color || 'hsl(var(--primary))',
                        }}
                      >
                        {profile.display_name?.[0]?.toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>

                    <h3 className="font-bold text-xl mb-1">
                      {profile.display_name || profile.username}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      @{profile.username}
                    </p>

                    {profile.bio && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {profile.bio}
                      </p>
                    )}

                    <div className="flex gap-4 mt-auto">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {profile.follower_count} followers
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        {profile.following_count}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopProfiles;
