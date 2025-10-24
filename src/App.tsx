import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Web3Provider } from "@/components/Web3Provider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Live from "./pages/Live";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import Creators from "./pages/Creators";
import Watch from "./pages/Watch";
import StorjTranscode from "./pages/StorjTranscode";
import Videos from "./pages/Videos";
import VideoWatch from "./pages/VideoWatch";
import About from "./pages/About";
import Meet from "./pages/Meet";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Web3Provider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/live" element={<Live />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/creators" element={<Creators />} />
            <Route path="/watch/:streamId" element={<Watch />} />
            <Route path="/storj-transcode" element={<StorjTranscode />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/video/:assetId" element={<VideoWatch />} />
            <Route path="/about" element={<About />} />
            <Route path="/meet" element={<Meet />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </Web3Provider>
  </QueryClientProvider>
);

export default App;
