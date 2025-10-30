// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICreatorNFT {
    function calculateRoyalty(uint256 tokenId, uint256 salePrice) 
        external 
        view 
        returns (address creator, uint256 royaltyAmount);
}

/**
 * @title NFTMarketplace
 * @dev Decentralized NFT marketplace for CreatorHub platform
 * @notice Handles NFT listings, sales, and royalty payments with platform fees
 */
contract NFTMarketplace is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    
    // Platform fee wallet
    address public platformWallet;
    
    // Platform fee percentage (250 = 2.5%)
    uint256 public platformFeePercentage = 250;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% max
    
    // Listing counter
    uint256 private _listingIdCounter;
    
    // Listing struct
    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        address paymentToken; // address(0) for native currency
        bool active;
        uint256 listedAt;
    }
    
    // Mappings
    mapping(uint256 => Listing) public listings;
    mapping(address => mapping(uint256 => uint256)) public nftToListing; // nftContract => tokenId => listingId
    
    // Statistics
    uint256 public totalSales;
    uint256 public totalVolume;
    uint256 public totalPlatformFees;
    
    // Whitelist for trusted NFT contracts (optional security measure)
    mapping(address => bool) public trustedNFTContracts;
    bool public whitelistEnabled;
    
    // Events
    event NFTListed(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        address paymentToken,
        uint256 timestamp
    );
    
    event NFTSold(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price,
        uint256 platformFee,
        uint256 royaltyAmount,
        uint256 sellerAmount,
        uint256 timestamp
    );
    
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller,
        uint256 timestamp
    );
    
    event PriceUpdated(
        uint256 indexed listingId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    event NFTContractWhitelisted(address indexed nftContract, bool status);
    
    event WhitelistStatusChanged(bool enabled);
    
    /**
     * @dev Constructor
     * @param _platformWallet Address that receives platform fees
     */
    constructor(address _platformWallet) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
        whitelistEnabled = false; // Disabled by default for flexibility
    }
    
    /**
     * @dev List an NFT for sale
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to list
     * @param price Listing price
     * @param paymentToken Payment token address (address(0) for native currency)
     */
    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address paymentToken
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(price > 0, "Price must be greater than 0");
        require(nftContract != address(0), "Invalid NFT contract");
        
        // Check whitelist if enabled
        if (whitelistEnabled) {
            require(trustedNFTContracts[nftContract], "NFT contract not whitelisted");
        }
        
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        
        // Check if already listed
        uint256 existingListingId = nftToListing[nftContract][tokenId];
        require(
            existingListingId == 0 || !listings[existingListingId].active,
            "Already listed"
        );
        
        _listingIdCounter++;
        uint256 newListingId = _listingIdCounter;
        
        listings[newListingId] = Listing({
            listingId: newListingId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            paymentToken: paymentToken,
            active: true,
            listedAt: block.timestamp
        });
        
        nftToListing[nftContract][tokenId] = newListingId;
        
        emit NFTListed(
            newListingId,
            nftContract,
            tokenId,
            msg.sender,
            price,
            paymentToken,
            block.timestamp
        );
        
        return newListingId;
    }
    
    /**
     * @dev Buy an NFT
     * @param listingId The listing ID
     */
    function buyNFT(uint256 listingId) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.seller != msg.sender, "Cannot buy your own NFT");
        
        IERC721 nft = IERC721(listing.nftContract);
        require(nft.ownerOf(listing.tokenId) == listing.seller, "Seller no longer owns NFT");
        
        uint256 price = listing.price;
        
        // Calculate fees
        uint256 platformFee = (price * platformFeePercentage) / FEE_DENOMINATOR;
        
        // Try to get royalty info (if supported)
        uint256 royaltyAmount = 0;
        address royaltyRecipient = address(0);
        
        try ICreatorNFT(listing.nftContract).calculateRoyalty(listing.tokenId, price) 
            returns (address creator, uint256 royalty) {
            royaltyRecipient = creator;
            royaltyAmount = royalty;
            
            // CRITICAL: Validate royalty doesn't exceed price
            require(royaltyAmount <= price, "Royalty exceeds price");
            require(platformFee + royaltyAmount <= price, "Total fees exceed price");
        } catch {
            // No royalty support, continue without it
        }
        
        uint256 sellerAmount = price - platformFee - royaltyAmount;
        require(sellerAmount > 0, "Seller amount must be positive");
        
        // Handle payment
        if (listing.paymentToken == address(0)) {
            // Native currency payment
            require(msg.value >= price, "Insufficient payment");
            
            // Transfer platform fee
            (bool platformSuccess, ) = platformWallet.call{value: platformFee}("");
            require(platformSuccess, "Platform fee transfer failed");
            
            // Transfer royalty if applicable
            if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                (bool royaltySuccess, ) = royaltyRecipient.call{value: royaltyAmount}("");
                require(royaltySuccess, "Royalty transfer failed");
            }
            
            // Transfer to seller
            (bool sellerSuccess, ) = listing.seller.call{value: sellerAmount}("");
            require(sellerSuccess, "Seller transfer failed");
            
            // Refund excess
            if (msg.value > price) {
                (bool refundSuccess, ) = msg.sender.call{value: msg.value - price}("");
                require(refundSuccess, "Refund failed");
            }
        } else {
            // ERC20 payment
            IERC20 paymentToken = IERC20(listing.paymentToken);
            
            // Transfer from buyer to recipients
            paymentToken.safeTransferFrom(msg.sender, platformWallet, platformFee);
            
            if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                paymentToken.safeTransferFrom(msg.sender, royaltyRecipient, royaltyAmount);
            }
            
            paymentToken.safeTransferFrom(msg.sender, listing.seller, sellerAmount);
        }
        
        // Transfer NFT
        nft.safeTransferFrom(listing.seller, msg.sender, listing.tokenId);
        
        // Update listing
        listing.active = false;
        
        // Update statistics
        totalSales++;
        totalVolume += price;
        totalPlatformFees += platformFee;
        
        emit NFTSold(
            listingId,
            listing.nftContract,
            listing.tokenId,
            listing.seller,
            msg.sender,
            price,
            platformFee,
            royaltyAmount,
            sellerAmount,
            block.timestamp
        );
    }
    
    /**
     * @dev Cancel a listing
     * @param listingId The listing ID
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");
        
        listing.active = false;
        
        emit ListingCancelled(listingId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Update listing price
     * @param listingId The listing ID
     * @param newPrice New price
     */
    function updatePrice(uint256 listingId, uint256 newPrice) external nonReentrant {
        require(newPrice > 0, "Price must be greater than 0");
        
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");
        
        uint256 oldPrice = listing.price;
        listing.price = newPrice;
        
        emit PriceUpdated(listingId, oldPrice, newPrice, block.timestamp);
    }
    
    /**
     * @dev Update platform fee (only owner)
     * @param newFee New platform fee percentage
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_PLATFORM_FEE, "Fee too high");
        
        uint256 oldFee = platformFeePercentage;
        platformFeePercentage = newFee;
        
        emit PlatformFeeUpdated(oldFee, newFee);
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
     * @dev Add or remove NFT contract from whitelist (only owner)
     * @param nftContract NFT contract address
     * @param status True to whitelist, false to remove
     */
    function setTrustedNFTContract(address nftContract, bool status) external onlyOwner {
        require(nftContract != address(0), "Invalid NFT contract");
        trustedNFTContracts[nftContract] = status;
        emit NFTContractWhitelisted(nftContract, status);
    }
    
    /**
     * @dev Enable or disable whitelist requirement (only owner)
     * @param enabled True to enable whitelist, false to disable
     */
    function setWhitelistEnabled(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
        emit WhitelistStatusChanged(enabled);
    }
    
    /**
     * @dev Check if NFT contract is trusted
     * @param nftContract NFT contract address
     */
    function isNFTContractTrusted(address nftContract) external view returns (bool) {
        if (!whitelistEnabled) {
            return true; // All contracts trusted when whitelist disabled
        }
        return trustedNFTContracts[nftContract];
    }
    
    /**
     * @dev Get listing details
     * @param listingId The listing ID
     */
    function getListing(uint256 listingId) 
        external 
        view 
        returns (Listing memory) 
    {
        return listings[listingId];
    }
    
    /**
     * @dev Calculate sale breakdown
     * @param listingId The listing ID
     */
    function calculateSaleBreakdown(uint256 listingId)
        external
        view
        returns (
            uint256 price,
            uint256 platformFee,
            uint256 royaltyAmount,
            uint256 sellerAmount
        )
    {
        Listing memory listing = listings[listingId];
        require(listing.active, "Listing not active");
        
        price = listing.price;
        platformFee = (price * platformFeePercentage) / FEE_DENOMINATOR;
        
        try ICreatorNFT(listing.nftContract).calculateRoyalty(listing.tokenId, price) 
            returns (address, uint256 royalty) {
            royaltyAmount = royalty;
        } catch {
            royaltyAmount = 0;
        }
        
        sellerAmount = price - platformFee - royaltyAmount;
        
        return (price, platformFee, royaltyAmount, sellerAmount);
    }
    
    /**
     * @dev Pause marketplace (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause marketplace (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdrawal (only owner, only for stuck funds)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = platformWallet.call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }
    
    /**
     * @dev Get total number of listings
     */
    function totalListings() external view returns (uint256) {
        return _listingIdCounter;
    }
    
    /**
     * @dev Required to receive NFTs
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
