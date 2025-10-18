import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, DollarSign, Video, Search, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandBanner } from "@/components/BrandBanner";
import crabRoyaltyBg from "@/assets/crab-royalty-bg.jpg";

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  tip_count: number;
  total_tips_received: number;
  theme_color: string | null;
}

const Creators = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"followers" | "tips" | "recent">("followers");

  useEffect(() => {
    fetchCreators();
  }, []);

  useEffect(() => {
    filterAndSortCreators();
  }, [creators, searchTerm, sortBy]);

  const fetchCreators = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, follower_count, tip_count, total_tips_received, theme_color')
      .order('follower_count', { ascending: false });

    if (!error && data) {
      setCreators(data);
    }
    setLoading(false);
  };

  const filterAndSortCreators = () => {
    let filtered = creators;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "followers":
          return b.follower_count - a.follower_count;
        case "tips":
          return b.tip_count - a.tip_count;
        case "recent":
          return 0; // Already sorted by default
        default:
          return 0;
      }
    });

    setFilteredCreators(filtered);
  };

  const getTopCreators = (metric: "followers" | "tips", limit: number = 10) => {
    return [...creators]
      .sort((a, b) => 
        metric === "followers" 
          ? b.follower_count - a.follower_count
          : b.tip_count - a.tip_count
      )
      .slice(0, limit);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Trophy className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Trophy className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BrandBanner />
      <div className="container px-4 pt-24 pb-16">
        <div className="mb-8 animate-fade-in text-center relative py-16">
          <div 
            className="absolute inset-0 -mx-4 opacity-20"
            style={{
              backgroundImage: `url(${crabRoyaltyBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div className="relative z-10">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
              Featured Creators
            </h1>
            <p className="text-foreground text-lg max-w-2xl mx-auto font-semibold drop-shadow-lg">
              Discover amazing creators, explore leaderboards, and find your next favorite streamer
            </p>
          </div>
        </div>

        <Tabs defaultValue="wall" className="w-full">
          <TabsList className="mb-8 grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="wall">
              <Users className="w-4 h-4 mr-2" />
              All Creators
            </TabsTrigger>
            <TabsTrigger value="followers">
              <TrendingUp className="w-4 h-4 mr-2" />
              Top Followed
            </TabsTrigger>
            <TabsTrigger value="tips">
              <Trophy className="w-4 h-4 mr-2" />
              Most Tipped
            </TabsTrigger>
          </TabsList>

          {/* Creator Wall Tab */}
          <TabsContent value="wall" className="space-y-6">
            <Card className="border-0 shadow-card">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search creators by name or username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Badge
                    variant={sortBy === "followers" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSortBy("followers")}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Most Followers
                  </Badge>
                  <Badge
                    variant={sortBy === "tips" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSortBy("tips")}
                  >
                    <DollarSign className="w-3 h-3 mr-1" />
                    Most Tips
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading creators...</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-scale-in">
                {filteredCreators.map((creator) => (
                  <Link key={creator.id} to={`/profile/${creator.id}`}>
                    <Card className="border-0 shadow-card hover:shadow-glow transition-all hover:scale-105 h-full">
                      <CardContent className="pt-6 text-center space-y-3">
                        <Avatar 
                          className="w-20 h-20 mx-auto ring-2"
                          style={{
                            borderColor: creator.theme_color || 'hsl(var(--primary))',
                          }}
                        >
                          <AvatarImage src={creator.avatar_url || undefined} />
                          <AvatarFallback 
                            className="text-2xl font-bold text-white"
                            style={{
                              backgroundColor: creator.theme_color || 'hsl(var(--primary))',
                            }}
                          >
                            {creator.display_name?.[0]?.toUpperCase() || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <h3 className="font-bold text-lg truncate">
                            {creator.display_name || creator.username}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            @{creator.username}
                          </p>
                        </div>

                        {creator.bio && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {creator.bio}
                          </p>
                        )}

                        <div className="flex justify-center gap-4 pt-2 border-t">
                          <div className="text-center">
                            <p className="text-lg font-bold text-primary">
                              {creator.follower_count}
                            </p>
                            <p className="text-xs text-muted-foreground">Followers</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-primary">
                              {creator.tip_count}
                            </p>
                            <p className="text-xs text-muted-foreground">Tips</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {!loading && filteredCreators.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No creators found matching your search</p>
              </div>
            )}
          </TabsContent>

          {/* Most Followed Leaderboard */}
          <TabsContent value="followers">
            <Card className="border-0 shadow-glow bg-gradient-card max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center text-2xl flex items-center justify-center gap-2">
                  <Users className="w-6 h-6" />
                  Most Followed Creators
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {getTopCreators("followers").map((creator, index) => (
                  <Link
                    key={creator.id}
                    to={`/profile/${creator.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-card hover:bg-accent/50 transition-all hover:scale-[1.02] border border-border">
                      <div className="flex items-center justify-center w-10">
                        {getRankIcon(index)}
                      </div>
                      
                      <Avatar 
                        className="w-12 h-12 ring-2"
                        style={{
                          borderColor: creator.theme_color || 'hsl(var(--primary))',
                        }}
                      >
                        <AvatarImage src={creator.avatar_url || undefined} />
                        <AvatarFallback 
                          className="text-lg font-bold text-white"
                          style={{
                            backgroundColor: creator.theme_color || 'hsl(var(--primary))',
                          }}
                        >
                          {creator.display_name?.[0]?.toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="font-semibold">{creator.display_name || creator.username}</h3>
                        <p className="text-sm text-muted-foreground">@{creator.username}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">
                          {creator.follower_count}
                        </p>
                        <p className="text-xs text-muted-foreground">followers</p>
                      </div>
                    </div>
                  </Link>
                ))}

                {getTopCreators("followers").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No creators yet. Be the first!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Most Tipped Leaderboard */}
          <TabsContent value="tips">
            <Card className="border-0 shadow-glow bg-gradient-card max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center text-2xl flex items-center justify-center gap-2">
                  <Trophy className="w-6 h-6" />
                  Most Supported Creators
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {getTopCreators("tips").map((creator, index) => (
                  <Link
                    key={creator.id}
                    to={`/profile/${creator.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-card hover:bg-accent/50 transition-all hover:scale-[1.02] border border-border">
                      <div className="flex items-center justify-center w-10">
                        {getRankIcon(index)}
                      </div>
                      
                      <Avatar 
                        className="w-12 h-12 ring-2"
                        style={{
                          borderColor: creator.theme_color || 'hsl(var(--primary))',
                        }}
                      >
                        <AvatarImage src={creator.avatar_url || undefined} />
                        <AvatarFallback 
                          className="text-lg font-bold text-white"
                          style={{
                            backgroundColor: creator.theme_color || 'hsl(var(--primary))',
                          }}
                        >
                          {creator.display_name?.[0]?.toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="font-semibold">{creator.display_name || creator.username}</h3>
                        <p className="text-sm text-muted-foreground">@{creator.username}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">
                          {creator.tip_count}
                        </p>
                        <p className="text-xs text-muted-foreground">tips received</p>
                      </div>
                    </div>
                  </Link>
                ))}

                {getTopCreators("tips").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No tips yet. Be the first to support a creator!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Creators;
