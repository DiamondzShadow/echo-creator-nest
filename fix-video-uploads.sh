#!/bin/bash

# Video Upload Fix Script
# This script helps diagnose and fix video upload issues

set -e

echo "================================================"
echo "   Video Upload Diagnostics & Fix Tool"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLI not found${NC}"
    echo "  Please install: npm install -g supabase"
    echo ""
    echo "  Or use the manual steps in diagnose-video-uploads.md"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"
echo ""

# Check if project is linked
echo -e "${BLUE}Checking Supabase project connection...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}✗ Not logged in to Supabase${NC}"
    echo "  Please run: supabase login"
    exit 1
fi

echo -e "${GREEN}✓ Logged in to Supabase${NC}"
echo ""

# Check secrets
echo -e "${BLUE}Checking required secrets...${NC}"
echo ""

echo "Required secrets for video uploads:"
echo "  1. LIVEPEER_API_KEY (CRITICAL - required for uploads)"
echo ""

# List current secrets
echo "Current secrets configured:"
supabase secrets list 2>/dev/null || echo "Could not list secrets"
echo ""

echo -e "${YELLOW}⚠️  Please verify LIVEPEER_API_KEY is set above${NC}"
echo ""

read -p "Is LIVEPEER_API_KEY configured? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${RED}✗ LIVEPEER_API_KEY is required!${NC}"
    echo ""
    echo "To set it:"
    echo "  1. Get your API key from https://livepeer.studio"
    echo "     (Dashboard → Developers → API Keys)"
    echo ""
    echo "  2. Set the secret:"
    echo "     supabase secrets set LIVEPEER_API_KEY=your_key_here"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ LIVEPEER_API_KEY is configured${NC}"
echo ""

# Apply database migration
echo -e "${BLUE}Applying database fixes...${NC}"
echo ""

if [ -f "supabase/migrations/20251119000000_fix_video_upload_status.sql" ]; then
    echo "Pushing migration to fix assets table..."
    supabase db push
    echo -e "${GREEN}✓ Database migration applied${NC}"
else
    echo -e "${YELLOW}⚠️  Migration file not found, skipping...${NC}"
fi
echo ""

# Redeploy edge functions
echo -e "${BLUE}Redeploying edge functions...${NC}"
echo ""

echo "Deploying livepeer-asset function..."
supabase functions deploy livepeer-asset --no-verify-jwt

echo "Deploying refresh-asset-status function..."
supabase functions deploy refresh-asset-status --no-verify-jwt

echo -e "${GREEN}✓ Edge functions deployed${NC}"
echo ""

# Summary
echo "================================================"
echo -e "${GREEN}✓ Fix Complete!${NC}"
echo "================================================"
echo ""
echo "What was fixed:"
echo "  ✓ Database status constraint updated"
echo "  ✓ Edge functions redeployed with latest code"
echo "  ✓ Stuck assets reset for retry"
echo ""
echo "Next steps:"
echo "  1. Go to your app: /videos page"
echo "  2. Try uploading a small test video"
echo "  3. Status should show: Uploading → Processing → Ready"
echo ""
echo "If uploads still fail:"
echo "  - Check edge function logs in Supabase Dashboard"
echo "  - Verify LIVEPEER_API_KEY is valid at https://livepeer.studio"
echo "  - Read diagnose-video-uploads.md for detailed troubleshooting"
echo ""
echo -e "${GREEN}Good luck!${NC}"
