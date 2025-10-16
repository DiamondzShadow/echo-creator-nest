import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

interface FollowButtonProps {
  profileId: string;
  currentUserId: string | undefined;
}

const FollowButton = ({ profileId, currentUserId }: FollowButtonProps) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!currentUserId) return;

    const checkFollowStatus = async () => {
      const { data } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId)
        .maybeSingle();

      setIsFollowing(!!data);
    };

    checkFollowStatus();
  }, [currentUserId, profileId]);

  const handleFollow = async () => {
    if (!currentUserId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow creators",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", profileId);

        if (error) throw error;

        setIsFollowing(false);
        toast({
          title: "Unfollowed",
          description: "You've unfollowed this creator",
        });
      } else {
        // Follow
        const { error } = await supabase
          .from("followers")
          .insert({
            follower_id: currentUserId,
            following_id: profileId,
          });

        if (error) throw error;

        setIsFollowing(true);
        toast({
          title: "Following!",
          description: "You're now following this creator",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't show follow button for own profile
  if (currentUserId === profileId) {
    return null;
  }

  return (
    <Button
      onClick={handleFollow}
      disabled={loading}
      className={
        isFollowing
          ? "bg-secondary hover:bg-secondary/80"
          : "bg-gradient-hero hover:opacity-90"
      }
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : isFollowing ? (
        <UserMinus className="w-4 h-4 mr-2" />
      ) : (
        <UserPlus className="w-4 h-4 mr-2" />
      )}
      {isFollowing ? "Unfollow" : "Follow"}
    </Button>
  );
};

export default FollowButton;
