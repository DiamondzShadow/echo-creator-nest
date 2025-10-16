import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon, base, arbitrum, optimism } from "wagmi/chains";

export const web3Config = getDefaultConfig({
  appName: "CreatorHub",
  projectId: "7a8854ee7c58b56eb8d461175ac5032c", // Get from https://cloud.walletconnect.com
  chains: [mainnet, polygon, base, arbitrum, optimism],
  ssr: false,
});

// Platform token contract addresses (deploy your own ERC-20)
export const PLATFORM_TOKEN_ADDRESSES = {
  mainnet: "0x...", // Deploy your token here
  polygon: "0x...", // Deploy on Polygon for low fees
  base: "0x...", // Deploy on Base for low fees
  arbitrum: "0x3D9648b2BF80c7bBd118DC431Fefedf98Ef883e1",
  optimism: "0x...",
} as const;

// Token gating thresholds
export const TOKEN_GATE_THRESHOLDS = {
  BASIC_ACCESS: BigInt(0), // No tokens required
  PREMIUM_CONTENT: BigInt(100 * 10 ** 18), // 100 tokens
  EXCLUSIVE_STREAMS: BigInt(1000 * 10 ** 18), // 1000 tokens
  VIP_ACCESS: BigInt(10000 * 10 ** 18), // 10000 tokens
} as const;
