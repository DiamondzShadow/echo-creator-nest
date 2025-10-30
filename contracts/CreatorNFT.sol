// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CreatorNFT
 * @dev ERC721 NFT contract for CreatorHub platform
 * @notice Allows creators to mint NFTs that can be listed on the marketplace
 */
contract CreatorNFT is ERC721URIStorage, ERC721Enumerable, ReentrancyGuard, Ownable {
    uint256 private _tokenIdCounter;
    
    // Mapping from token ID to creator address
    mapping(uint256 => address) public tokenCreator;
    
    // Mapping from token ID to royalty percentage (basis points, e.g., 1000 = 10%)
    mapping(uint256 => uint256) public tokenRoyalty;
    
    // Platform fee for minting (in wei)
    uint256 public mintingFee = 0.001 ether;
    
    // Platform wallet for fees
    address public platformWallet;
    
    // Maximum royalty percentage (30%)
    uint256 public constant MAX_ROYALTY_PERCENTAGE = 3000;
    uint256 public constant ROYALTY_DENOMINATOR = 10000;
    
    // Events
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string tokenURI,
        uint256 royaltyPercentage,
        uint256 timestamp
    );
    
    event RoyaltyPaid(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );
    
    event MintingFeeUpdated(uint256 oldFee, uint256 newFee);
    
    /**
     * @dev Constructor
     * @param _platformWallet Address that receives platform fees
     */
    constructor(address _platformWallet) 
        ERC721("CreatorHub NFT", "CHNFT") 
        Ownable(msg.sender) 
    {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }
    
    /**
     * @dev Mint a new NFT
     * @param to Address to mint the NFT to (usually msg.sender)
     * @param uri IPFS URI for the NFT metadata
     * @param royaltyPercentage Royalty percentage in basis points (e.g., 1000 = 10%)
     */
    function mintNFT(
        address to,
        string memory uri,
        uint256 royaltyPercentage
    ) external payable nonReentrant returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(uri).length > 0, "URI cannot be empty");
        require(royaltyPercentage <= MAX_ROYALTY_PERCENTAGE, "Royalty too high");
        require(msg.value >= mintingFee, "Insufficient minting fee");
        
        // Transfer only the minting fee to platform
        (bool success, ) = platformWallet.call{value: mintingFee}("");
        require(success, "Fee transfer failed");
        
        // Refund excess payment
        if (msg.value > mintingFee) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - mintingFee}("");
            require(refundSuccess, "Refund failed");
        }
        
        unchecked {
            _tokenIdCounter++;
        }
        uint256 newTokenId = _tokenIdCounter;
        
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, uri);
        
        tokenCreator[newTokenId] = msg.sender;
        tokenRoyalty[newTokenId] = royaltyPercentage;
        
        emit NFTMinted(
            newTokenId,
            msg.sender,
            uri,
            royaltyPercentage,
            block.timestamp
        );
        
        return newTokenId;
    }
    
    /**
     * @dev Calculate royalty payment for a token
     * @param tokenId The token ID
     * @param salePrice The sale price
     * @return creator The original creator address
     * @return royaltyAmount The royalty amount to pay
     */
    function calculateRoyalty(uint256 tokenId, uint256 salePrice)
        public
        view
        returns (address creator, uint256 royaltyAmount)
    {
        // Token existence check - ownerOf will revert if token doesn't exist
        ownerOf(tokenId);
        
        creator = tokenCreator[tokenId];
        royaltyAmount = (salePrice * tokenRoyalty[tokenId]) / ROYALTY_DENOMINATOR;
        
        return (creator, royaltyAmount);
    }
    
    /**
     * @dev Update minting fee (only owner)
     * @param newFee New minting fee in wei
     */
    function updateMintingFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = mintingFee;
        mintingFee = newFee;
        emit MintingFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @dev Update platform wallet (only owner)
     * @param newWallet New platform wallet address
     */
    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }
    
    /**
     * @dev Get total number of minted NFTs
     */
    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Get all NFTs owned by an address (simple version for wallets/OpenSea)
     * @param owner The owner address
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokens = new uint256[](tokenCount);
        
        for (uint256 i = 0; i < tokenCount; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokens;
    }
    
    /**
     * @dev Get NFTs owned by an address (paginated to avoid gas limits)
     * @param owner The owner address
     * @param start Starting index
     * @param limit Maximum number of tokens to return
     */
    function tokensOfOwnerPaginated(
        address owner,
        uint256 start,
        uint256 limit
    ) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        if (tokenCount == 0) {
            return new uint256[](0);
        }
        
        if (start >= tokenCount) {
            return new uint256[](0);
        }
        
        uint256 end = start + limit;
        if (end > tokenCount) {
            end = tokenCount;
        }
        
        uint256 resultLength = end - start;
        uint256[] memory tokens = new uint256[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, start + i);
        }
        
        return tokens;
    }
    
    /**
     * @dev Get total token count for an owner (helper for pagination)
     * @param owner The owner address
     */
    function getOwnerTokenCount(address owner) external view returns (uint256) {
        return balanceOf(owner);
    }
    
    /**
     * @dev Returns the contract-level metadata URI for OpenSea
     */
    function contractURI() external pure returns (string memory) {
        return "https://creatorhub.io/api/contract-metadata";
    }
    
    // Required overrides for multiple inheritance (v5.x)
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
