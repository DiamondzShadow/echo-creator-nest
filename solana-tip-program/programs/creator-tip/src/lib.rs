use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

/// Platform fee: 3% = 300 basis points
const PLATFORM_FEE_BPS: u64 = 300;
const BPS_DENOMINATOR: u64 = 10000;

#[program]
pub mod creator_tip {
    use super::*;

    /// Send a tip to a creator with automatic 3% platform fee
    /// 
    /// # Arguments
    /// * `amount` - Total tip amount in lamports (1 SOL = 1,000,000,000 lamports)
    /// 
    /// # Fee Split
    /// * Platform: 3% (0.03 SOL per 1 SOL tip)
    /// * Creator: 97% (0.97 SOL per 1 SOL tip)
    pub fn send_tip(ctx: Context<SendTip>, amount: u64) -> Result<()> {
        require!(amount > 0, TipError::InvalidAmount);
        
        // Calculate fee split
        let platform_fee = amount
            .checked_mul(PLATFORM_FEE_BPS)
            .ok_or(TipError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(TipError::MathOverflow)?;
        
        let creator_amount = amount
            .checked_sub(platform_fee)
            .ok_or(TipError::MathOverflow)?;

        require!(creator_amount > 0, TipError::InvalidAmount);

        // Transfer platform fee
        let platform_transfer_ix = system_program::Transfer {
            from: ctx.accounts.tipper.to_account_info(),
            to: ctx.accounts.platform_wallet.to_account_info(),
        };
        let platform_cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            platform_transfer_ix,
        );
        system_program::transfer(platform_cpi_ctx, platform_fee)?;

        // Transfer creator amount
        let creator_transfer_ix = system_program::Transfer {
            from: ctx.accounts.tipper.to_account_info(),
            to: ctx.accounts.creator.to_account_info(),
        };
        let creator_cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            creator_transfer_ix,
        );
        system_program::transfer(creator_cpi_ctx, creator_amount)?;

        // Emit event for off-chain tracking
        emit!(TipSent {
            tipper: ctx.accounts.tipper.key(),
            creator: ctx.accounts.creator.key(),
            total_amount: amount,
            platform_fee,
            creator_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!(
            "Tip sent: {} lamports total, {} to creator, {} platform fee",
            amount,
            creator_amount,
            platform_fee
        );

        Ok(())
    }

    /// Send a tip with optional memo (e.g., video ID, message)
    pub fn send_tip_with_memo(
        ctx: Context<SendTip>,
        amount: u64,
        memo: String,
    ) -> Result<()> {
        require!(memo.len() <= 200, TipError::MemoTooLong);
        
        // Reuse send_tip logic
        let result = send_tip(ctx, amount);

        // Emit memo event
        emit!(TipWithMemo {
            tipper: ctx.accounts.tipper.key(),
            creator: ctx.accounts.creator.key(),
            amount,
            memo,
            timestamp: Clock::get()?.unix_timestamp,
        });

        result
    }
}

#[derive(Accounts)]
pub struct SendTip<'info> {
    /// The account sending the tip (must sign)
    #[account(mut)]
    pub tipper: Signer<'info>,
    
    /// The creator receiving the tip
    /// CHECK: This account will receive SOL, validation done in transfer
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    
    /// Platform wallet receiving the 3% fee
    /// CHECK: This is the platform's treasury wallet
    #[account(
        mut,
        constraint = platform_wallet.key() == PLATFORM_WALLET @ TipError::InvalidPlatformWallet
    )]
    pub platform_wallet: AccountInfo<'info>,
    
    /// Solana system program for transfers
    pub system_program: Program<'info, System>,
}

// Platform wallet address (replace with your actual wallet)
// This should be set during deployment
pub const PLATFORM_WALLET: Pubkey = pubkey!("YourPlatformWalletPublicKeyHere");

#[event]
pub struct TipSent {
    pub tipper: Pubkey,
    pub creator: Pubkey,
    pub total_amount: u64,
    pub platform_fee: u64,
    pub creator_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TipWithMemo {
    pub tipper: Pubkey,
    pub creator: Pubkey,
    pub amount: u64,
    pub memo: String,
    pub timestamp: i64,
}

#[error_code]
pub enum TipError {
    #[msg("Tip amount must be greater than 0")]
    InvalidAmount,
    
    #[msg("Math operation overflow")]
    MathOverflow,
    
    #[msg("Invalid platform wallet")]
    InvalidPlatformWallet,
    
    #[msg("Memo is too long (max 200 characters)")]
    MemoTooLong,
}

// Helper macro for compile-time pubkey parsing
#[macro_export]
macro_rules! pubkey {
    ($str:expr) => {{
        anchor_lang::prelude::Pubkey::try_from($str).unwrap()
    }};
}
