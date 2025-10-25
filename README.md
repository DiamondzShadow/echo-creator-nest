# Live Streaming Platform

A modern live streaming platform with instant browser streaming, software streaming (OBS), and pull stream support.

## 🎥 Features

- **Instant Browser Streaming** - Go live directly from your browser (powered by LiveKit)
- **Software Streaming** - Use OBS, Streamlabs, or any RTMP software (powered by Livepeer)
- **Pull Streaming** - Re-stream from YouTube, Twitch, TikTok, etc.
- **FVM YouTube Clone** - Decentralized video platform on Filecoin Virtual Machine
- **Web3 Integration** - Wallet connection and tipping with crypto
- **Profile System** - Creator profiles with followers and tips

## 🚀 Recent Updates

### ✅ LiveKit Migration Complete!

Instant browser streaming now uses **LiveKit** instead of Livepeer for:
- ⚡ 2-3 second connection time (was 5-10s)
- 📉 200-400ms latency (was 0.5-3s)
- 🔄 Automatic reconnection
- 📱 Better mobile support
- 🎯 95%+ reliability

See **[INSTANT_STREAM_LIVEKIT_MIGRATION.md](./docs/improvements/INSTANT_STREAM_LIVEKIT_MIGRATION.md)** for details.

### 🧹 Codebase Cleanup

- Organized 24 documentation files into `/docs` directory
- Removed unused components and dead code
- Streamlined navigation (4 core features vs 8+ buttons)
- Consolidated duplicate tabs and features

## Project info

**URL**: https://lovable.dev/projects/3c573353-c0fb-4125-b052-a56f89c77dfd

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/3c573353-c0fb-4125-b052-a56f89c77dfd) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

### Frontend
- **Vite** - Build tool
- **TypeScript** - Type safety
- **React** - UI framework
- **shadcn-ui** - Component library
- **Tailwind CSS** - Styling

### Backend & Streaming
- **Supabase** - Backend as a Service (database, auth, edge functions)
- **LiveKit** - Instant WebRTC streaming (browser broadcasting)
- **Livepeer** - RTMP streaming (OBS, pull streams)
- **FVM** - Filecoin Virtual Machine for decentralized video storage
- **Lighthouse** - IPFS storage for videos and thumbnails
- **RainbowKit + wagmi** - Web3 wallet integration

## ⚙️ Setup

### 1. Install Dependencies

```sh
npm install
```

### 2. Configure Environment Variables

Copy `.env` and fill in your values:

```bash
# Supabase (already configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_key

# LiveKit (for instant streaming - required)
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud

# FVM YouTube Clone (optional - see docs/setup/FVM_SETUP.md)
VITE_FVM_CONTRACT_ADDRESS=0x853F25A4fD9120F1A5DB8cbA05f434cC6613904a
VITE_LIGHTHOUSE_API_KEY=your_lighthouse_api_key
```

### 3. Setup LiveKit

For instant browser streaming to work:

1. Go to https://cloud.livekit.io and create a free account
2. Create a new project
3. Copy your API credentials
4. Set Supabase secrets:

```bash
supabase secrets set LIVEKIT_API_KEY=your_key
supabase secrets set LIVEKIT_API_SECRET=your_secret
```

5. Deploy edge function:

```bash
supabase functions deploy livekit-token
```

📚 **Full setup guide**: [LIVEKIT_SETUP.md](./docs/setup/LIVEKIT_SETUP.md)

### 4. Run Development Server

```sh
npm run dev
```

## 📁 Project Structure

```
src/
├── components/
│   ├── InstantLiveStreamLiveKit.tsx  # Browser broadcasting (LiveKit)
│   ├── LiveKitViewer.tsx             # Stream viewer (LiveKit)
│   ├── LiveStreamPlayer.tsx          # Stream player (Livepeer)
│   ├── FVMUpload.tsx                 # FVM video upload
│   ├── FVMVideoList.tsx              # FVM video browser
│   ├── FVMVideoPlayer.tsx            # FVM video player
│   └── ...
├── pages/
│   ├── Live.tsx                      # Go live page
│   ├── Watch.tsx                     # Watch streams
│   ├── Discover.tsx                  # Browse streams
│   ├── FVM.tsx                       # FVM YouTube Clone
│   └── ...
├── lib/
│   ├── livekit-config.ts             # LiveKit helpers
│   └── fvm-config.ts                 # FVM contract helpers
└── integrations/
    └── supabase/                     # Supabase client

contracts/
└── YouTube.sol                       # FVM smart contract

supabase/functions/
├── livekit-token/                    # LiveKit JWT generation
├── livepeer-stream/                  # Livepeer RTMP setup
└── ...
```

## 📖 Documentation

**[📚 Full Documentation →](./docs/README.md)**

All technical documentation is organized in the `/docs` directory:

### Quick Links
- **[Setup Guides](./docs/setup/)** - Initial configuration (LiveKit, FVM, Web3, Storj, etc.)
- **[User Guides](./docs/guides/)** - Tutorials and how-tos
- **[Fixes](./docs/fixes/)** - Troubleshooting and bug fixes
- **[Improvements](./docs/improvements/)** - Feature enhancements and migrations

### Most Used Docs
- **[LIVEKIT_SETUP.md](./docs/setup/LIVEKIT_SETUP.md)** - Complete LiveKit setup guide
- **[FVM_SETUP.md](./docs/setup/FVM_SETUP.md)** - FVM YouTube Clone on Polygon
- **[TESTING_GUIDE.md](./docs/guides/TESTING_GUIDE.md)** - Testing best practices

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3c573353-c0fb-4125-b052-a56f89c77dfd) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
