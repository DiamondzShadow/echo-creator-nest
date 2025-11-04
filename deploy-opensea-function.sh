#!/bin/bash

echo "================================================"
echo "OpenSea Edge Function Deployment Script"
echo "================================================"
echo ""

# Check if logged in to Supabase
echo "Step 1: Checking Supabase login status..."
if ! npx supabase projects list > /dev/null 2>&1; then
    echo "❌ Not logged in to Supabase CLI"
    echo ""
    echo "Please run: npx supabase login"
    echo "Then run this script again."
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Set the OpenSea API key
echo "Step 2: Setting OpenSea API key as secret..."
npx supabase secrets set OPENSEA_API_KEY="7715571f6eab4ebea3f4b6f7950d6ed6" --project-ref woucixqbnzmvlvnaaelb

if [ $? -eq 0 ]; then
    echo "✅ API key set successfully"
else
    echo "❌ Failed to set API key"
    exit 1
fi
echo ""

# Deploy the edge function
echo "Step 3: Deploying opensea-proxy edge function..."
npx supabase functions deploy opensea-proxy --project-ref woucixqbnzmvlvnaaelb

if [ $? -eq 0 ]; then
    echo "✅ Edge function deployed successfully"
else
    echo "❌ Failed to deploy edge function"
    exit 1
fi
echo ""

echo "================================================"
echo "✅ Deployment Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Update src/lib/opensea.ts and set USE_EDGE_FUNCTION = true"
echo "2. Restart your dev server"
echo "3. Test the NFT portfolio page"
echo ""
echo "Test URL: http://localhost:5173/nft-portfolio"
echo ""
