import { ethers } from "ethers";

// YouTube Contract ABI - Update this after deploying your contract
export const YOUTUBE_CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "hash",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "category",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "thumbnailHash",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "date",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "author",
        "type": "address"
      }
    ],
    "name": "VideoUploaded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_videoHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_description",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_location",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_category",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_thumbnailHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_date",
        "type": "string"
      }
    ],
    "name": "uploadVideo",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "videoCount",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "videos",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "hash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "category",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "thumbnailHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "date",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "author",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Contract Address - Deployed on Polygon
export const YOUTUBE_CONTRACT_ADDRESS = import.meta.env.VITE_FVM_CONTRACT_ADDRESS || "0x853F25A4fD9120F1A5DB8cbA05f434cC6613904a";

// Lighthouse API Key for decentralized storage
export const LIGHTHOUSE_API_KEY = import.meta.env.VITE_LIGHTHOUSE_API_KEY || "";

// Polygon Network Config (where the contract is deployed)
export const POLYGON_CHAIN = {
  id: 137,
  name: "Polygon",
  network: "polygon",
  nativeCurrency: {
    decimals: 18,
    name: "MATIC",
    symbol: "MATIC",
  },
  rpcUrls: {
    default: {
      http: ["https://polygon-rpc.com"],
    },
    public: {
      http: ["https://polygon-rpc.com"],
    },
  },
  blockExplorers: {
    default: { name: "PolygonScan", url: "https://polygonscan.com" },
  },
  testnet: false,
};

// Filecoin Hyperspace Testnet Chain Config (alternative)
export const HYPERSPACE_CHAIN = {
  id: 3141,
  name: "Filecoin Hyperspace",
  network: "hyperspace",
  nativeCurrency: {
    decimals: 18,
    name: "tFIL",
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

// Current chain being used for the YouTube contract
export const YOUTUBE_CHAIN = POLYGON_CHAIN;

// Video interface
export interface FVMVideo {
  id: number;
  hash: string;
  title: string;
  description: string;
  location: string;
  category: string;
  thumbnailHash: string;
  date: string;
  author: string;
}

/**
 * Get the YouTube contract instance
 * @returns Contract instance
 */
export async function getYouTubeContract() {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask to use this feature");
  }

  // Creating a new provider
  const provider = new ethers.BrowserProvider(window.ethereum);
  
  // Getting the signer
  const signer = await provider.getSigner();
  
  // Creating a new contract instance with the signer, address and ABI
  const contract = new ethers.Contract(
    YOUTUBE_CONTRACT_ADDRESS,
    YOUTUBE_CONTRACT_ABI,
    signer
  );
  
  return contract;
}

/**
 * Get all videos from the contract
 * @returns Array of videos
 */
export async function getAllVideos(): Promise<FVMVideo[]> {
  const contract = await getYouTubeContract();
  const videoCount = await contract.videoCount();
  const videos: FVMVideo[] = [];

  for (let i = Number(videoCount); i >= 1; i--) {
    const video = await contract.videos(i);
    videos.push({
      id: Number(video.id),
      hash: video.hash,
      title: video.title,
      description: video.description,
      location: video.location,
      category: video.category,
      thumbnailHash: video.thumbnailHash,
      date: video.date,
      author: video.author,
    });
  }

  return videos;
}

/**
 * Get a single video by ID
 * @param id Video ID
 * @returns Video object
 */
export async function getVideoById(id: number): Promise<FVMVideo> {
  const contract = await getYouTubeContract();
  const video = await contract.videos(id);
  
  return {
    id: Number(video.id),
    hash: video.hash,
    title: video.title,
    description: video.description,
    location: video.location,
    category: video.category,
    thumbnailHash: video.thumbnailHash,
    date: video.date,
    author: video.author,
  };
}

/**
 * Upload a video to the contract
 * @param videoData Video metadata
 */
export async function uploadVideo(videoData: {
  videoHash: string;
  title: string;
  description: string;
  location: string;
  category: string;
  thumbnailHash: string;
}): Promise<void> {
  const contract = await getYouTubeContract();
  const date = new Date().toISOString();

  const tx = await contract.uploadVideo(
    videoData.videoHash,
    videoData.title,
    videoData.description,
    videoData.location,
    videoData.category,
    videoData.thumbnailHash,
    date
  );

  await tx.wait();
}

// Lighthouse IPFS Gateway
export const LIGHTHOUSE_GATEWAY = "https://gateway.lighthouse.storage/ipfs";

// Alternative IPFS Gateways
export const IPFS_GATEWAYS = [
  "https://gateway.lighthouse.storage/ipfs",
  "https://ipfs.io/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://gateway.pinata.cloud/ipfs",
];

/**
 * Get IPFS URL for a given hash
 * @param hash IPFS hash
 * @param gateway Gateway to use (default: Lighthouse)
 * @returns Full IPFS URL
 */
export function getIPFSUrl(hash: string, gateway: string = LIGHTHOUSE_GATEWAY): string {
  return `${gateway}/${hash}`;
}
