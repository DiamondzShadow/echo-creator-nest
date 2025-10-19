import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Radio, Play, StopCircle, Video, Settings2, Wifi } from "lucide-react";

const API_BASE = "https://api.daydream.live";

type StreamCreateResponse = {
  id: string;
  stream_key: string;
  output_stream_url: string;
  output_playback_id: string;
  name?: string;
  whip_url: string;
};

type StreamStatusResponse = {
  success: boolean;
  error: any;
  data?: any;
};

const defaultNegative = "blurry, low quality, flat, 2d";

const Daydream = () => {
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState<string>("");
  const [pipelineId, setPipelineId] = useState<string>("pip_SD-turbo");
  const [streamId, setStreamId] = useState<string>("");
  const [playbackId, setPlaybackId] = useState<string>("");
  const [whipUrl, setWhipUrl] = useState<string>("");

  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [prompt, setPrompt] = useState<string>("superman");
  const [negativePrompt, setNegativePrompt] = useState<string>(defaultNegative);
  const [numSteps, setNumSteps] = useState<number>(50);
  const [seed, setSeed] = useState<number>(42);
  const [updatingParams, setUpdatingParams] = useState<boolean>(false);

  const [statusMsg, setStatusMsg] = useState<string>("Ready");
  const statusIntervalRef = useRef<number | null>(null);
  const [connQuality, setConnQuality] = useState<string>("unknown");
  const [lastError, setLastError] = useState<string | null>(null);

  const handleCreateStream = async () => {
    if (!apiKey) {
      toast({ title: "API key required", description: "Enter your Daydream API key", variant: "destructive" });
      return;
    }

    try {
      setStatusMsg("Creating stream...");
      const res = await fetch(`${API_BASE}/v1/streams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ pipeline_id: pipelineId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create failed (${res.status}): ${text}`);
      }

      const data = (await res.json()) as StreamCreateResponse;
      setStreamId(data.id);
      setPlaybackId(data.output_playback_id);
      setWhipUrl(data.whip_url);
      setStatusMsg("Stream created. Connect your camera to go live.");
      toast({ title: "Stream created", description: `ID: ${data.id}` });
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message || String(e), variant: "destructive" });
      setStatusMsg("Create failed");
    }
  };

  const stopTracks = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const cleanupPeerConnection = () => {
    try {
      pcRef.current?.getSenders().forEach((s) => {
        try { s.track?.stop(); } catch {}
      });
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
  };

  const handleConnectCamera = async () => {
    if (!whipUrl) {
      toast({ title: "No WHIP URL", description: "Create a stream first", variant: "destructive" });
      return;
    }
    if (isStreaming || isConnecting) return;

    try {
      setIsConnecting(true);
      setStatusMsg("Requesting camera/mic...");

      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: true,
      });
      localStreamRef.current = media;
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play().catch(() => {});
      }

      setStatusMsg("Setting up WebRTC (WHIP)...");
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pcRef.current = pc;

      media.getTracks().forEach((track) => pc.addTrack(track, media));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const resp = await fetch(whipUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp || "",
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`WHIP error (${resp.status}): ${txt}`);
      }

      const answerSdp = await resp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setIsStreaming(true);
      setStatusMsg("Live! Streaming to Daydream");
      toast({ title: "Live", description: "Webcam streaming started" });
    } catch (e: any) {
      setIsStreaming(false);
      cleanupPeerConnection();
      stopTracks();
      setStatusMsg("Camera connect failed");
      toast({ title: "Camera connect failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    cleanupPeerConnection();
    stopTracks();
    setIsStreaming(false);
    setStatusMsg("Disconnected");
  };

  const handleUpdateParams = async () => {
    if (!apiKey || !streamId) {
      toast({ title: "Missing info", description: "Create stream and enter API key", variant: "destructive" });
      return;
    }
    try {
      setUpdatingParams(true);
      setStatusMsg("Updating parameters...");
      const res = await fetch(`${API_BASE}/v1/streams/${streamId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          params: {
            model_id: "stabilityai/sd-turbo",
            prompt,
            prompt_interpolation_method: "slerp",
            normalize_prompt_weights: true,
            normalize_seed_weights: true,
            negative_prompt: negativePrompt || defaultNegative,
            num_inference_steps: numSteps,
            seed,
            t_index_list: [0, 8, 17],
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Update failed (${res.status}): ${text}`);
      }
      setStatusMsg("Parameters updated");
      toast({ title: "Updated", description: "Parameters applied" });
    } catch (e: any) {
      setStatusMsg("Update failed");
      toast({ title: "Update failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setUpdatingParams(false);
    }
  };

  useEffect(() => {
    if (!apiKey || !streamId) return;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/streams/${streamId}/status`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as StreamStatusResponse;
        const gw = data?.data?.gateway_status;
        const quality = gw?.ingest_metrics?.stats?.conn_quality || "unknown";
        const errMsg = gw?.error?.error_message || data?.data?.inference_status?.last_error || null;
        setConnQuality(quality);
        setLastError(errMsg);
      } catch {
        // ignore
      }
    };

    poll();
    statusIntervalRef.current = window.setInterval(poll, 8000);
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [apiKey, streamId]);

  useEffect(() => {
    return () => {
      handleDisconnect();
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-16">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="border-0 shadow-glow bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-3xl bg-gradient-hero bg-clip-text text-transparent flex items-center gap-2">
                <Radio className="w-6 h-6" /> Webcam Livestream with StreamDiffusion
              </CardTitle>
              <CardDescription>Create a Daydream stream, publish your webcam via WHIP (WebRTC), and view AI-processed output.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      placeholder="Enter your daydream.live API key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pipeline</Label>
                    <Input
                      value={pipelineId}
                      onChange={(e) => setPipelineId(e.target.value)}
                      placeholder="pip_SD-turbo"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleCreateStream}>
                      <Settings2 className="w-4 h-4 mr-2" /> Create Stream
                    </Button>
                  </div>

                  <div className="rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4" />
                      <span>Status: {statusMsg}</span>
                    </div>
                    {streamId && (
                      <div className="mt-2 grid gap-1">
                        <div className="font-mono text-xs break-all">ID: {streamId}</div>
                        <div className="text-xs">Conn quality: {connQuality}</div>
                        {lastError && <div className="text-xs text-destructive">Error: {lastError}</div>}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Prompt</Label>
                      <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Negative prompt</Label>
                      <Textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Steps</Label>
                        <Input
                          type="number"
                          min={1}
                          max={200}
                          value={numSteps}
                          onChange={(e) => setNumSteps(Number(e.target.value || 1))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Seed</Label>
                        <Input
                          type="number"
                          value={seed}
                          onChange={(e) => setSeed(Number(e.target.value || 0))}
                        />
                      </div>
                    </div>
                    <Button onClick={handleUpdateParams} disabled={!streamId || updatingParams} variant="secondary">
                      {updatingParams ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings2 className="w-4 h-4 mr-2" />}
                      Update Parameters
                    </Button>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <Card className="border-muted bg-muted/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium">Webcam Preview</div>
                        <div className="flex gap-2">
                          {!isStreaming ? (
                            <Button onClick={handleConnectCamera} disabled={!whipUrl || isConnecting}>
                              {isConnecting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" /> Go Live
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button variant="destructive" onClick={handleDisconnect}>
                              <StopCircle className="w-4 h-4 mr-2" /> Stop
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="aspect-video bg-black/60 rounded-lg overflow-hidden flex items-center justify-center">
                        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                        {!localStreamRef.current && (
                          <div className="text-center p-8 text-muted-foreground">
                            <Video className="w-10 h-10 mx-auto mb-3" />
                            Allow camera and click Go Live
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-muted bg-muted/20">
                    <CardContent className="pt-6">
                      <div className="font-medium mb-3">AI Output (low latency)</div>
                      <div className="aspect-video rounded-lg overflow-hidden bg-black/60">
                        {playbackId ? (
                          <iframe
                            title="AI Output"
                            className="w-full h-full"
                            src={`https://lvpr.tv/?v=${playbackId}&lowLatency=force`}
                            allow="autoplay; picture-in-picture; fullscreen"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                            Create stream to see output here
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Daydream;
