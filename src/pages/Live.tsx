import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Video, StopCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

const Live = () => {
  const [user, setUser] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamId, setStreamId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("live_streams")
        .insert({
          user_id: user.id,
          title,
          description,
          is_live: true,
          started_at: new Date().toISOString(),
          stream_key: crypto.randomUUID(),
        })
        .select()
        .single();

      if (error) throw error;

      setStreamId(data.id);
      setIsLive(true);
      toast({
        title: "You're live!",
        description: "Your stream has started successfully.",
      });
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

  const handleEndStream = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("live_streams")
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
        })
        .eq("id", streamId);

      if (error) throw error;

      setIsLive(false);
      setStreamId(null);
      setTitle("");
      setDescription("");
      toast({
        title: "Stream ended",
        description: "Your live stream has been ended.",
      });
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          {!isLive ? (
            <Card className="border-0 shadow-glow bg-gradient-card animate-scale-in">
              <CardHeader>
                <CardTitle className="text-3xl bg-gradient-hero bg-clip-text text-transparent">
                  Start Your Live Stream
                </CardTitle>
                <CardDescription>
                  Share your content with your audience in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStartStream} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Stream Title</Label>
                    <Input
                      id="title"
                      placeholder="What are you streaming today?"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell viewers what to expect..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-hero hover:opacity-90 text-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Video className="mr-2 h-5 w-5" />
                        Go Live
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <Card className="border-0 shadow-glow bg-gradient-card">
                <CardContent className="pt-6">
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-hero opacity-20 animate-pulse" />
                    <div className="relative z-10 text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-hero flex items-center justify-center mx-auto mb-4 shadow-glow animate-float">
                        <Video className="w-10 h-10 text-primary-foreground" />
                      </div>
                      <p className="text-2xl font-bold mb-2">You're Live!</p>
                      <p className="text-muted-foreground">{title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-bold mb-4">Stream Info</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Title:</span> {title}
                    </p>
                    {description && (
                      <p>
                        <span className="font-medium">Description:</span> {description}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      <span className="text-green-500 font-bold">● LIVE</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleEndStream}
                size="lg"
                variant="destructive"
                className="w-full text-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Ending...
                  </>
                ) : (
                  <>
                    <StopCircle className="mr-2 h-5 w-5" />
                    End Stream
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Live;
