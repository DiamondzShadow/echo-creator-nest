import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon, base, arbitrum, optimism } from "wagmi/chains";
import type { Chain } from "wagmi/chains";

// Filecoin Hyperspace Testnet Chain
export const filecoinHyperspace: Chain = {
  id: 3141,
  name: "Filecoin Hyperspace",
  nativeCurrency: {
    decimals: 18,
    name: "Test Filecoin",
    symbol: "tFIL",
  },
  rpcUrls: {
    default: {
      http: ["https://api.hyperspace.node.glif.io/rpc/v1"],
    },
    public: {
      http: ["https://api.hyperspace.node.glif.io/rpc/v1"],
    },
  },
  blockExplorers: {
    default: { name: "Filscan", url: "https://hyperspace.filscan.io" },
  },
  testnet: true,
};

export const web3Config = getDefaultConfig({
  appName: "CreatorHub",
  projectId: "7a8854ee7c58b56eb8d461175ac5032c", // Get from https://cloud.walletconnect.com
  chains: [mainnet, polygon, base, arbitrum, optimism, filecoinHyperspace],
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

// TipJar contract addresses - Handles tips with 3% platform fee
export const TIPJAR_CONTRACT_ADDRESS = "0x8B0e8894B16d685A7586A55cb9e76B0fFcEb096c";

// Platform fee wallet (receives 3% of all tips)
export const PLATFORM_WALLET = "0x18b2b2ce7d05Bfe0883Ff874ba0C536A89D07363";

// TipJar contract ABI
export const TIPJAR_ABI = [
  {
    "inputs": [],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "emergencyWithdrawToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address payable",
        "name": "creator",
        "type": "address"
      }
    ],
    "name": "tipWithNative",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "tipWithToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "calculateTipSplit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "platformFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "creatorAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "FEE_DENOMINATOR",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PLATFORM_FEE_PERCENTAGE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformWallet",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalPlatformFeesCollected",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalTipsProcessed",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
