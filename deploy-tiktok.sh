#!/bin/bash

# TikTok Integration Deployment Script
# This script deploys all TikTok edge functions and sets environment variables

set -e  # Exit on error

echo "🎵 CrabbyTV TikTok Integration Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓${NC} Supabase CLI found"
echo ""

# Set environment variables
echo "📝 Setting environment variables..."
echo ""

read -p "Do you want to set TIKTOK_CLIENT_KEY? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj"
    supabase secrets set TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj
    echo -e "${GREEN}✓${NC} TIKTOK_CLIENT_KEY set"
fi

read -p "Do you want to set TIKTOK_CLIENT_SECRET? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting TIKTOK_CLIENT_SECRET=oBZPY9dOyVHacTc6n6izs0DigncJ71Sp"
    supabase secrets set TIKTOK_CLIENT_SECRET=oBZPY9dOyVHacTc6n6izs0DigncJ71Sp
    echo -e "${GREEN}✓${NC} TIKTOK_CLIENT_SECRET set"
fi

echo ""
echo "🚀 Deploying TikTok edge functions..."
echo ""

# Array of functions to deploy
functions=(
    "tiktok-oauth"
    "tiktok-streams"
    "tiktok-user-data"
    "tiktok-webhook"
    "tiktok-upload"
)

# Deploy each function
for func in "${functions[@]}"; do
    echo "Deploying $func..."
    if supabase functions deploy "$func"; then
        echo -e "${GREEN}✓${NC} $func deployed successfully"
    else
        echo -e "${RED}✗${NC} Failed to deploy $func"
        exit 1
    fi
    echo ""
done

echo ""
echo "=========================================="
echo -e "${GREEN}✅ TikTok Integration Deployed Successfully!${NC}"
echo "=========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure TikTok Developer Portal:"
echo "   - Redirect URI: https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-oauth"
echo "   - Webhook URL: https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-webhook"
echo ""
echo "2. Test the integration:"
echo "   - Visit https://crabbytv.com/live"
echo "   - Click TikTok tab"
echo "   - Click 'Connect TikTok Account'"
echo ""
echo "3. Read the documentation:"
echo "   - Quick Start: TIKTOK_QUICK_START.md"
echo "   - Full Guide: TIKTOK_INTEGRATION_SETUP.md"
echo ""
echo "🎉 Happy streaming!"
