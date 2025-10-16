import { StorjTranscodeWithUpload } from '@/components/StorjTranscodeWithUpload';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileVideo, Cloud, Zap, Shield } from 'lucide-react';

const StorjTranscode = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Cloud className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">Storj Video Transcoding</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Upload videos to decentralized Storj storage and transcode them using Livepeer's powerful transcoding API
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" />
                Decentralized Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Store your videos securely on Storj's decentralized cloud storage network with built-in redundancy and encryption.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Fast Transcoding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Leverage Livepeer's decentralized transcoding network to convert videos to multiple formats and quality levels.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Secure & Private
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your videos are encrypted and distributed across the Storj network, ensuring privacy and availability.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Component */}
        <StorjTranscodeWithUpload />

        {/* Documentation Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileVideo className="h-5 w-5" />
                Getting Started
              </CardTitle>
              <CardDescription>
                Learn how to set up Storj and Livepeer for video transcoding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Quick Setup</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Create a Storj account and generate S3 credentials</li>
                  <li>Create a Livepeer Studio account and API key</li>
                  <li>Configure environment variables</li>
                  <li>Deploy the edge functions</li>
                  <li>Start transcoding!</li>
                </ol>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <a href="/STORJ_SETUP.md" target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Setup Guide
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Documentation
              </CardTitle>
              <CardDescription>
                Comprehensive guides and API documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/STORJ_TRANSCODE_GUIDE.md" target="_blank">
                  Transcode API Guide
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/examples/storj-transcode-example.ts" target="_blank">
                  Code Examples
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="https://docs.storj.io/" target="_blank" rel="noopener noreferrer">
                  Storj Documentation
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="https://docs.livepeer.org/" target="_blank" rel="noopener noreferrer">
                  Livepeer Documentation
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              Understanding the transcoding workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h4 className="font-medium mb-2">Upload</h4>
                <p className="text-sm text-muted-foreground">
                  Upload your video file to Storj's decentralized storage
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h4 className="font-medium mb-2">Transcode</h4>
                <p className="text-sm text-muted-foreground">
                  Livepeer transcodes to multiple quality levels
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h4 className="font-medium mb-2">Store</h4>
                <p className="text-sm text-muted-foreground">
                  Transcoded videos are saved back to Storj
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-primary">4</span>
                </div>
                <h4 className="font-medium mb-2">Playback</h4>
                <p className="text-sm text-muted-foreground">
                  Stream videos with adaptive bitrate playback
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StorjTranscode;
