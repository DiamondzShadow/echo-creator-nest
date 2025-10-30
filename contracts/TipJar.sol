// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TipJar
 * @dev Decentralized tipping contract for CreatorHub platform
 * @notice Handles tips in ETH and ERC20 tokens with automatic 3% platform fee
 */
contract TipJar is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Platform fee wallet - receives 3% of all tips
    address public immutable platformWallet;
    
    // Platform fee percentage (300 = 3%)
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 300;
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Tracking
    uint256 public totalTipsProcessed;
    uint256 public totalPlatformFeesCollected;

    // Events
    event TipSent(
        address indexed tipper,
        address indexed creator,
        uint256 amount,
        uint256 platformFee,
        uint256 creatorAmount,
        address token,
        uint256 timestamp
    );

    event PlatformFeeCollected(
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @dev Constructor sets the platform wallet address
     * @param _platformWallet Address that receives platform fees
     */
    constructor(address _platformWallet) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }

    /**
     * @dev Send tip in native currency (ETH, MATIC, etc.)
     * @param creator Address of the content creator receiving the tip
     */
    function tipWithNative(address payable creator) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(creator != address(0), "Invalid creator address");
        require(creator != msg.sender, "Cannot tip yourself");

        // Calculate platform fee (3%) and creator amount (97%)
        uint256 platformFee = (msg.value * PLATFORM_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 creatorAmount = msg.value - platformFee;

        // Transfer platform fee
        (bool platformSuccess, ) = platformWallet.call{value: platformFee}("");
        require(platformSuccess, "Platform fee transfer failed");

        // Transfer creator amount
        (bool creatorSuccess, ) = creator.call{value: creatorAmount}("");
        require(creatorSuccess, "Creator transfer failed");

        // Update stats
        totalTipsProcessed++;
        totalPlatformFeesCollected += platformFee;

        // Emit events
        emit PlatformFeeCollected(address(0), platformFee, block.timestamp);
        emit TipSent(
            msg.sender,
            creator,
            msg.value,
            platformFee,
            creatorAmount,
            address(0), // address(0) represents native currency
            block.timestamp
        );
    }

    /**
     * @dev Send tip in ERC20 tokens
     * @param creator Address of the content creator receiving the tip
     * @param token Address of the ERC20 token contract
     * @param amount Amount of tokens to tip
     */
    function tipWithToken(
        address creator,
        address token,
        uint256 amount
    ) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(amount > 0, "Tip amount must be greater than 0");
        require(creator != address(0), "Invalid creator address");
        require(token != address(0), "Invalid token address");
        require(creator != msg.sender, "Cannot tip yourself");

        IERC20 tokenContract = IERC20(token);

        // Calculate platform fee (3%) and creator amount (97%)
        uint256 platformFee = (amount * PLATFORM_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 creatorAmount = amount - platformFee;

        // Transfer tokens from tipper to platform wallet
        tokenContract.safeTransferFrom(msg.sender, platformWallet, platformFee);

        // Transfer tokens from tipper to creator
        tokenContract.safeTransferFrom(msg.sender, creator, creatorAmount);

        // Update stats
        totalTipsProcessed++;
        totalPlatformFeesCollected += platformFee;

        // Emit events
        emit PlatformFeeCollected(token, platformFee, block.timestamp);
        emit TipSent(
            msg.sender,
            creator,
            amount,
            platformFee,
            creatorAmount,
            token,
            block.timestamp
        );
    }

    /**
     * @dev Pause contract in case of emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal function (only for stuck funds)
     * Should rarely if ever be needed due to direct transfers
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = platformWallet.call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }

    /**
     * @dev Emergency token withdrawal (only for stuck tokens)
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
     * @dev View function to calculate what the creator will receive
     * @param amount The tip amount
     * @return platformFee The fee that goes to the platform
     * @return creatorAmount The amount that goes to the creator
     */
    function calculateTipSplit(uint256 amount) 
        external 
        pure 
        returns (uint256 platformFee, uint256 creatorAmount) 
    {
        platformFee = (amount * PLATFORM_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        creatorAmount = amount - platformFee;
        return (platformFee, creatorAmount);
    }

    /**
     * @dev Allow contract to receive native currency
     */
    receive() external payable {
        revert("Use tipWithNative() function");
    }
}
