// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title VideoTipping
 * @dev Enhanced tipping contract with custom per-video fee settings
 * @notice Allows creators to set custom tip fees for their videos (0-50%)
 */
contract VideoTipping is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    
    // Platform fee wallet
    address public platformWallet;
    
    // Default platform fee percentage (300 = 3%)
    uint256 public defaultPlatformFee = 300;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MAX_CUSTOM_FEE = 5000; // 50% max custom fee
    
    // Video tip settings
    struct VideoTipSettings {
        address creator;
        uint256 customFeePercentage; // Additional fee set by creator (0-5000)
        bool hasCustomFee;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    // Mapping: videoId => VideoTipSettings
    mapping(string => VideoTipSettings) public videoTipSettings;
    
    // Mapping: creator => total tips received
    mapping(address => uint256) public creatorEarnings;
    
    // Statistics
    uint256 public totalTips;
    uint256 public totalPlatformFees;
    uint256 public totalCreatorFees;
    uint256 public totalVolume;
    
    // Events
    event VideoTipSettingsCreated(
        string indexed videoId,
        address indexed creator,
        uint256 customFeePercentage,
        uint256 timestamp
    );
    
    event VideoTipSettingsUpdated(
        string indexed videoId,
        address indexed creator,
        uint256 oldFeePercentage,
        uint256 newFeePercentage,
        uint256 timestamp
    );
    
    event TipSentToVideo(
        string indexed videoId,
        address indexed tipper,
        address indexed creator,
        uint256 totalAmount,
        uint256 platformFee,
        uint256 customFee,
        uint256 creatorAmount,
        address token,
        uint256 timestamp
    );
    
    event DefaultPlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    /**
     * @dev Constructor
     * @param _platformWallet Address that receives platform fees
     */
    constructor(address _platformWallet) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }
    
    /**
     * @dev Set custom tip fee for a video
     * @param videoId Unique identifier for the video
     * @param customFeePercentage Custom fee percentage (0-5000, i.e., 0-50%)
     * @notice This function can be front-run. For high-security use cases, consider
     * implementing off-chain signing or commit-reveal patterns.
     */
    function setVideoTipSettings(
        string memory videoId,
        uint256 customFeePercentage
    ) external nonReentrant {
        require(bytes(videoId).length > 0, "Invalid video ID");
        require(bytes(videoId).length <= 256, "Video ID too long"); // Gas optimization
        require(customFeePercentage <= MAX_CUSTOM_FEE, "Custom fee too high");
        
        // Validate that combined fees don't exceed 100%
        uint256 totalFees = defaultPlatformFee + customFeePercentage;
        require(totalFees < FEE_DENOMINATOR, "Combined fees too high");
        
        VideoTipSettings storage settings = videoTipSettings[videoId];
        
        if (!settings.hasCustomFee) {
            // Creating new settings
            videoTipSettings[videoId] = VideoTipSettings({
                creator: msg.sender,
                customFeePercentage: customFeePercentage,
                hasCustomFee: true,
                createdAt: block.timestamp,
                updatedAt: block.timestamp
            });
            
            emit VideoTipSettingsCreated(
                videoId,
                msg.sender,
                customFeePercentage,
                block.timestamp
            );
        } else {
            // Updating existing settings
            require(settings.creator == msg.sender, "Not the video creator");
            
            uint256 oldFee = settings.customFeePercentage;
            settings.customFeePercentage = customFeePercentage;
            settings.updatedAt = block.timestamp;
            
            emit VideoTipSettingsUpdated(
                videoId,
                msg.sender,
                oldFee,
                customFeePercentage,
                block.timestamp
            );
        }
    }
    
    /**
     * @dev Tip a video with native currency
     * @param videoId The video to tip
     * @param creator The video creator address
     * @notice Fee precision: Integer division may result in minor rounding (< 1 wei difference)
     */
    function tipVideoWithNative(
        string memory videoId,
        address payable creator
    ) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(creator != address(0), "Invalid creator address");
        require(creator != msg.sender, "Cannot tip yourself");
        require(bytes(videoId).length > 0, "Invalid video ID");
        
        // Calculate fees
        uint256 platformFee = (msg.value * defaultPlatformFee) / FEE_DENOMINATOR;
        uint256 customFee = 0;
        
        VideoTipSettings memory settings = videoTipSettings[videoId];
        if (settings.hasCustomFee && settings.creator == creator) {
            customFee = (msg.value * settings.customFeePercentage) / FEE_DENOMINATOR;
        }
        
        // Validate fee amounts
        require(platformFee + customFee < msg.value, "Fees exceed tip amount");
        
        uint256 creatorAmount = msg.value - platformFee - customFee;
        require(creatorAmount > 0, "Invalid fee configuration");
        
        // Transfer platform fee
        (bool platformSuccess, ) = platformWallet.call{value: platformFee}("");
        require(platformSuccess, "Platform fee transfer failed");
        
        // Transfer custom fee to creator (this is additional creator revenue)
        // The custom fee goes to the creator as bonus on top of the base amount
        uint256 totalCreatorAmount = creatorAmount + customFee;
        (bool creatorSuccess, ) = creator.call{value: totalCreatorAmount}("");
        require(creatorSuccess, "Creator transfer failed");
        
        // Update statistics
        totalTips++;
        totalPlatformFees += platformFee;
        totalCreatorFees += customFee;
        totalVolume += msg.value;
        creatorEarnings[creator] += totalCreatorAmount;
        
        emit TipSentToVideo(
            videoId,
            msg.sender,
            creator,
            msg.value,
            platformFee,
            customFee,
            totalCreatorAmount,
            address(0),
            block.timestamp
        );
    }
    
    /**
     * @dev Tip a video with ERC20 tokens
     * @param videoId The video to tip
     * @param creator The video creator address
     * @param token The ERC20 token address
     * @param amount The tip amount
     * @notice Fee precision: Integer division may result in minor rounding (< 1 token unit difference)
     */
    function tipVideoWithToken(
        string memory videoId,
        address creator,
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Tip amount must be greater than 0");
        require(creator != address(0), "Invalid creator address");
        require(token != address(0), "Invalid token address");
        require(creator != msg.sender, "Cannot tip yourself");
        require(bytes(videoId).length > 0, "Invalid video ID");
        
        IERC20 tokenContract = IERC20(token);
        
        // Calculate fees
        uint256 platformFee = (amount * defaultPlatformFee) / FEE_DENOMINATOR;
        uint256 customFee = 0;
        
        VideoTipSettings memory settings = videoTipSettings[videoId];
        if (settings.hasCustomFee && settings.creator == creator) {
            customFee = (amount * settings.customFeePercentage) / FEE_DENOMINATOR;
        }
        
        // Validate fee amounts
        require(platformFee + customFee < amount, "Fees exceed tip amount");
        
        uint256 creatorAmount = amount - platformFee - customFee;
        require(creatorAmount > 0, "Invalid fee configuration");
        
        // Transfer platform fee
        tokenContract.safeTransferFrom(msg.sender, platformWallet, platformFee);
        
        // Transfer total creator amount (base + custom fee)
        uint256 totalCreatorAmount = creatorAmount + customFee;
        tokenContract.safeTransferFrom(msg.sender, creator, totalCreatorAmount);
        
        // Update statistics
        totalTips++;
        totalPlatformFees += platformFee;
        totalCreatorFees += customFee;
        totalVolume += amount;
        creatorEarnings[creator] += totalCreatorAmount;
        
        emit TipSentToVideo(
            videoId,
            msg.sender,
            creator,
            amount,
            platformFee,
            customFee,
            totalCreatorAmount,
            token,
            block.timestamp
        );
    }
    
    /**
     * @dev Calculate tip breakdown for a video
     * @param videoId The video ID
     * @param amount The tip amount
     * @return platformFee The platform fee
     * @return customFee The custom creator fee
     * @return creatorAmount The base creator amount
     * @return totalCreatorAmount Total amount creator receives
     */
    function calculateTipBreakdown(
        string memory videoId,
        uint256 amount
    ) external view returns (
        uint256 platformFee,
        uint256 customFee,
        uint256 creatorAmount,
        uint256 totalCreatorAmount
    ) {
        platformFee = (amount * defaultPlatformFee) / FEE_DENOMINATOR;
        
        VideoTipSettings memory settings = videoTipSettings[videoId];
        if (settings.hasCustomFee) {
            customFee = (amount * settings.customFeePercentage) / FEE_DENOMINATOR;
        } else {
            customFee = 0;
        }
        
        creatorAmount = amount - platformFee - customFee;
        totalCreatorAmount = creatorAmount + customFee;
        
        return (platformFee, customFee, creatorAmount, totalCreatorAmount);
    }
    
    /**
     * @dev Get video tip settings
     * @param videoId The video ID
     */
    function getVideoTipSettings(string memory videoId) 
        external 
        view 
        returns (VideoTipSettings memory) 
    {
        return videoTipSettings[videoId];
    }
    
    /**
     * @dev Update default platform fee (only owner)
     * @param newFee New default platform fee
     */
    function updateDefaultPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Platform fee too high"); // Max 10%
        
        uint256 oldFee = defaultPlatformFee;
        defaultPlatformFee = newFee;
        
        emit DefaultPlatformFeeUpdated(oldFee, newFee);
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
     * @dev Pause contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdrawal (only owner, for stuck funds)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = platformWallet.call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }
    
    /**
     * @dev Emergency token withdrawal (only owner, for stuck tokens)
     * @param token Address of the ERC20 token to withdraw
     */
    function emergencyWithdrawToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        require(balance > 0, "No token balance to withdraw");
        
        tokenContract.safeTransfer(platformWallet, balance);
    }
    
    /**
     * @dev Allow contract to receive native currency
     */
    receive() external payable {
        revert("Use tipVideoWithNative() function");
    }
}
