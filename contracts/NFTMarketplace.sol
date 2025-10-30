// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
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
 * @dev Enhanced NFT marketplace with pull payment pattern and time-based expiration
 * @notice Secure marketplace following ThirdWeb best practices
 */
contract NFTMarketplace is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    
    // Constants
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% max
    uint256 public constant MAX_ROYALTY_PERCENTAGE = 2000; // 20% max royalty
    uint256 public constant DEFAULT_LISTING_DURATION = 90 days;
    uint256 public constant MIN_LISTING_DURATION = 1 days;
    uint256 public constant MAX_LISTING_DURATION = 365 days;
    
    // Platform configuration
    address public platformWallet;
    uint256 public platformFeePercentage = 250; // 2.5%
    
    // Listing counter
    uint256 private _listingIdCounter;
    
    // Listing struct with expiration
    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        address paymentToken; // address(0) for native currency
        bool active;
        uint256 listedAt;
        uint256 expiresAt;
    }
    
    // Mappings
    mapping(uint256 => Listing) public listings;
    mapping(address => mapping(uint256 => uint256)) public nftToListing;
    
    // Pull payment pattern - pending withdrawals
    mapping(address => uint256) public pendingWithdrawals;
    
    // Statistics
    uint256 public totalSales;
    uint256 public totalVolume;
    uint256 public totalPlatformFees;
    
    // Whitelist for trusted NFT contracts
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
        uint256 expiresAt,
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
    
    event ListingExpired(
        uint256 indexed listingId,
        uint256 timestamp
    );
    
    event PriceUpdated(
        uint256 indexed listingId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );
    
    event ExpirationExtended(
        uint256 indexed listingId,
        uint256 newExpiresAt,
        uint256 timestamp
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event NFTContractWhitelisted(address indexed nftContract, bool status);
    event WhitelistStatusChanged(bool enabled);
    event FundsWithdrawn(address indexed user, uint256 amount);
    
    /**
     * @dev Constructor
     * @param _platformWallet Address that receives platform fees
     */
    constructor(address _platformWallet) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
        whitelistEnabled = false;
    }
    
    /**
     * @dev List an NFT for sale with expiration time
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to list
     * @param price Listing price
     * @param paymentToken Payment token address (address(0) for native currency)
     * @param duration Duration in seconds (0 for default)
     */
    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address paymentToken,
        uint256 duration
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(price > 0, "Price must be greater than 0");
        require(nftContract != address(0), "Invalid NFT contract");
        
        // Validate duration
        if (duration == 0) {
            duration = DEFAULT_LISTING_DURATION;
        }
        require(duration >= MIN_LISTING_DURATION, "Duration too short");
        require(duration <= MAX_LISTING_DURATION, "Duration too long");
        
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
        
        unchecked {
            _listingIdCounter++;
        }
        uint256 newListingId = _listingIdCounter;
        uint256 expiresAt = block.timestamp + duration;
        
        listings[newListingId] = Listing({
            listingId: newListingId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            paymentToken: paymentToken,
            active: true,
            listedAt: block.timestamp,
            expiresAt: expiresAt
        });
        
        nftToListing[nftContract][tokenId] = newListingId;
        
        emit NFTListed(
            newListingId,
            nftContract,
            tokenId,
            msg.sender,
            price,
            paymentToken,
            expiresAt,
            block.timestamp
        );
        
        return newListingId;
    }
    
    /**
     * @dev Buy an NFT with pull payment pattern
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
        require(block.timestamp < listing.expiresAt, "Listing expired");
        require(listing.seller != msg.sender, "Cannot buy your own NFT");
        
        IERC721 nft = IERC721(listing.nftContract);
        require(nft.ownerOf(listing.tokenId) == listing.seller, "Seller no longer owns NFT");
        
        uint256 price = listing.price;
        
        // Calculate platform fee
        uint256 platformFee = (price * platformFeePercentage) / FEE_DENOMINATOR;
        
        // Try to get royalty info with 20% cap
        uint256 royaltyAmount = 0;
        address royaltyRecipient = address(0);
        
        try ICreatorNFT(listing.nftContract).calculateRoyalty(listing.tokenId, price) 
            returns (address creator, uint256 royalty) {
            royaltyRecipient = creator;
            royaltyAmount = royalty;
            
            // CRITICAL: Cap royalty at 20% and validate
            uint256 maxRoyalty = (price * MAX_ROYALTY_PERCENTAGE) / FEE_DENOMINATOR;
            if (royaltyAmount > maxRoyalty) {
                royaltyAmount = maxRoyalty;
            }
            
            require(royaltyAmount <= price, "Royalty exceeds price");
            require(platformFee + royaltyAmount <= price, "Total fees exceed price");
        } catch {
            // No royalty support, continue without it
        }
        
        uint256 sellerAmount = price - platformFee - royaltyAmount;
        require(sellerAmount > 0, "Seller amount must be positive");
        
        // Handle payment with pull pattern
        if (listing.paymentToken == address(0)) {
            // Native currency payment
            require(msg.value >= price, "Insufficient payment");
            
            // Add to pending withdrawals instead of direct transfer
            pendingWithdrawals[platformWallet] += platformFee;
            
            if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                pendingWithdrawals[royaltyRecipient] += royaltyAmount;
            }
            
            pendingWithdrawals[listing.seller] += sellerAmount;
            
            // Refund excess
            if (msg.value > price) {
                pendingWithdrawals[msg.sender] += (msg.value - price);
            }
        } else {
            // ERC20 payment - still direct transfer for tokens
            IERC20 paymentToken = IERC20(listing.paymentToken);
            
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
     * @dev Withdraw pending funds (pull payment pattern)
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(msg.sender, amount);
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
     * @dev Mark expired listing as inactive (can be called by anyone)
     * @param listingId The listing ID
     */
    function expireListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(block.timestamp >= listing.expiresAt, "Listing not expired");
        
        listing.active = false;
        
        emit ListingExpired(listingId, block.timestamp);
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
        require(block.timestamp < listing.expiresAt, "Listing expired");
        require(listing.seller == msg.sender, "Not the seller");
        
        uint256 oldPrice = listing.price;
        listing.price = newPrice;
        
        emit PriceUpdated(listingId, oldPrice, newPrice, block.timestamp);
    }
    
    /**
     * @dev Extend listing expiration
     * @param listingId The listing ID
     * @param additionalDuration Additional duration in seconds
     */
    function extendListing(uint256 listingId, uint256 additionalDuration) external nonReentrant {
        require(additionalDuration >= MIN_LISTING_DURATION, "Duration too short");
        
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");
        
        uint256 newExpiresAt = listing.expiresAt + additionalDuration;
        require(newExpiresAt <= block.timestamp + MAX_LISTING_DURATION, "Extension too long");
        
        listing.expiresAt = newExpiresAt;
        
        emit ExpirationExtended(listingId, newExpiresAt, block.timestamp);
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
            return true;
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
     * @dev Calculate sale breakdown with 20% royalty cap
     * @param listingId The listing ID
     */
    function calculateSaleBreakdown(uint256 listingId)
        external
        view
        returns (
            uint256 price,
            uint256 platformFee,
            uint256 royaltyAmount,
            uint256 sellerAmount,
            bool isExpired
        )
    {
        Listing memory listing = listings[listingId];
        require(listing.active || block.timestamp >= listing.expiresAt, "Listing not active");
        
        price = listing.price;
        platformFee = (price * platformFeePercentage) / FEE_DENOMINATOR;
        isExpired = block.timestamp >= listing.expiresAt;
        
        try ICreatorNFT(listing.nftContract).calculateRoyalty(listing.tokenId, price) 
            returns (address, uint256 royalty) {
            royaltyAmount = royalty;
            
            // Apply 20% cap
            uint256 maxRoyalty = (price * MAX_ROYALTY_PERCENTAGE) / FEE_DENOMINATOR;
            if (royaltyAmount > maxRoyalty) {
                royaltyAmount = maxRoyalty;
            }
        } catch {
            royaltyAmount = 0;
        }
        
        sellerAmount = price - platformFee - royaltyAmount;
        
        return (price, platformFee, royaltyAmount, sellerAmount, isExpired);
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
