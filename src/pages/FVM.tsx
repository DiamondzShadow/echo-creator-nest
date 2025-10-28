import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Video, Info, ExternalLink } from "lucide-react";
import FVMUpload from "@/components/FVMUpload";
import FVMVideoList from "@/components/FVMVideoList";
import FVMVideoPlayer from "@/components/FVMVideoPlayer";
import { type FVMVideo } from "@/types/fvm";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";

export default function FVM() {
  const [selectedVideo, setSelectedVideo] = useState<FVMVideo | null>(null);
  const [activeTab, setActiveTab] = useState("browse");
  const { address, isConnected } = useAccount();

  const handleVideoClick = (video: FVMVideo) => {
    setSelectedVideo(video);
    setActiveTab("watch");
  };

  const handleBackToList = () => {
    setSelectedVideo(null);
    setActiveTab("browse");
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">FVM YouTube Clone</h1>
            <p className="text-muted-foreground mt-2">
              Decentralized video platform powered by Filecoin Virtual Machine
            </p>
          </div>
          <a
            href="https://docs.filecoin.io/smart-contracts/fundamentals/the-fvm"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            Learn about FVM
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About FVM YouTube Clone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            This decentralized YouTube clone leverages the power of:
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li><strong>FVM (Filecoin Virtual Machine)</strong> - Smart contracts on Filecoin blockchain</li>
            <li><strong>IPFS via Lighthouse</strong> - Decentralized storage for videos and thumbnails</li>
            <li><strong>Web3 Wallet</strong> - MetaMask integration for blockchain interactions</li>
            <li><strong>Permanent Storage</strong> - Videos stored on Filecoin with guaranteed retrieval</li>
          </ul>
        </CardContent>
      </Card>

      {/* Wallet Connection Alert */}
      {!isConnected && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to upload videos or interact with the blockchain.
            You can still browse videos without connecting.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Browse Videos
          </TabsTrigger>
          <TabsTrigger 
            value="upload" 
            disabled={!isConnected}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Video
          </TabsTrigger>
          <TabsTrigger 
            value="watch" 
            disabled={!selectedVideo}
            className="flex items-center gap-2"
          >
            <Video className="h-4 w-4" />
            Watch
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-6">
          <FVMVideoList onVideoClick={handleVideoClick} />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          {isConnected ? (
            <FVMUpload />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Info className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Please connect your wallet to upload videos to the blockchain
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="watch" className="mt-6">
          {selectedVideo ? (
            <div className="space-y-4">
              <Button variant="outline" onClick={handleBackToList}>
                ← Back to Videos
              </Button>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <FVMVideoPlayer video={selectedVideo} />
                </div>
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Related Videos</CardTitle>
                      <CardDescription>More from this category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Related videos will appear here
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Video Selected</h3>
                <p className="text-muted-foreground text-center">
                  Browse videos and click on one to watch it here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Setup Guide</CardTitle>
          <CardDescription>Get started with FVM YouTube Clone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold">Deploy Smart Contract</h4>
                <p className="text-sm text-muted-foreground">
                  Deploy the YouTube.sol contract to Filecoin Hyperspace testnet using Remix IDE.
                  See <code className="text-xs bg-secondary px-2 py-1 rounded">contracts/README.md</code> for instructions.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold">Get Lighthouse API Key</h4>
                <p className="text-sm text-muted-foreground">
                  Sign up at <a href="https://files.lighthouse.storage" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">lighthouse.storage</a> and 
                  generate an API key for IPFS uploads.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold">Configure Environment</h4>
                <p className="text-sm text-muted-foreground">
                  Add environment variables to your <code className="text-xs bg-secondary px-2 py-1 rounded">.env</code> file:
                </p>
                <pre className="text-xs bg-secondary p-3 rounded-lg mt-2 overflow-x-auto">
{`VITE_FVM_CONTRACT_ADDRESS=your_contract_address
VITE_LIGHTHOUSE_API_KEY=your_lighthouse_api_key`}
                </pre>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold">Install Dependencies</h4>
                <p className="text-sm text-muted-foreground">
                  Install required packages:
                </p>
                <pre className="text-xs bg-secondary p-3 rounded-lg mt-2">
                  npm install @lighthouse-web3/sdk ethers
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
