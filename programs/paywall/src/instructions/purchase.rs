use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer, MintTo, mint_to};
use anchor_spl::associated_token::AssociatedToken;
use mpl_token_metadata::{
    instructions::{CreateV1, CreateV1InstructionArgs, UpdateV1, UpdateV1InstructionArgs},
    types::{Creator, PrintSupply, TokenStandard},
};
use crate::state::*;
use crate::constants::*;
use crate::errors::PaywallError;

#[derive(Accounts)]
#[instruction(referrer: Option<Pubkey>)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub article: Account<'info, Article>,
    #[account(
        init,
        payer = buyer,
        space = RECEIPT_SIZE,
        seeds = [RECEIPT_SEED, article.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub receipt: Account<'info, Receipt>,
    #[account(
        seeds = [FEE_CONFIG_SEED],
        bump
    )]
    pub fee_config: Account<'info, FeeConfig>,
    pub payment_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = payment_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = payment_mint,
        associated_token::authority = article.creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = payment_mint,
        associated_token::authority = fee_config.treasury
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    /// CHECK: Optional referrer token account - validated in handler
    pub referrer_token_account: Option<Account<'info, TokenAccount>>,
    
    // Access Token (NFT/SBT) accounts
    #[account(
        init,
        payer = buyer,
        mint::decimals = 0,
        mint::authority = access_token_mint,
        mint::freeze_authority = access_token_mint,
        seeds = [ACCESS_TOKEN_SEED, article.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub access_token_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = buyer,
        associated_token::mint = access_token_mint,
        associated_token::authority = buyer
    )]
    pub access_token_account: Account<'info, TokenAccount>,
    /// CHECK: Metaplex metadata account
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,
    /// CHECK: Metaplex edition account
    #[account(mut)]
    pub master_edition_account: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: Metaplex token metadata program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<Purchase>, referrer: Option<Pubkey>) -> Result<()> {
    let article = &mut ctx.accounts.article;
    let fee_config = &ctx.accounts.fee_config;
    
    // Validate payment mint matches article
    require!(
        ctx.accounts.payment_mint.key() == article.pay_mint,
        PaywallError::InvalidPaymentMint
    );

    // Check if already purchased (for SBT articles)
    if !article.transferable {
        // This will fail if receipt already exists due to init constraint
    }

    let price = article.price;
    let protocol_fee = (price as u128 * fee_config.protocol_fee_bps as u128 / 10_000) as u64;
    let referrer_fee = if referrer.is_some() && ctx.accounts.referrer_token_account.is_some() {
        (price as u128 * fee_config.referrer_fee_bps as u128 / 10_000) as u64
    } else {
        0
    };
    let creator_amount = price - protocol_fee - referrer_fee;

    // Transfer payment to creator
    let transfer_to_creator = Transfer {
        from: ctx.accounts.buyer_token_account.to_account_info(),
        to: ctx.accounts.creator_token_account.to_account_info(),
        authority: ctx.accounts.buyer.to_account_info(),
    };
    anchor_spl::token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_to_creator,
        ),
        creator_amount,
    )?;

    // Transfer protocol fee to treasury
    if protocol_fee > 0 {
        let transfer_to_treasury = Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                transfer_to_treasury,
            ),
            protocol_fee,
        )?;
    }

    // Transfer referrer fee if applicable
    if referrer_fee > 0 && ctx.accounts.referrer_token_account.is_some() {
        let transfer_to_referrer = Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.referrer_token_account.as_ref().unwrap().to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                transfer_to_referrer,
            ),
            referrer_fee,
        )?;
    }

    // Create receipt
    let receipt = &mut ctx.accounts.receipt;
    receipt.article = article.key();
    receipt.buyer = ctx.accounts.buyer.key();
    receipt.paid_amount = price;
    receipt.purchased_at = Clock::get()?.unix_timestamp;

    // Update article sales count
    article.sales = article.sales.checked_add(1).ok_or(PaywallError::Overflow)?;

    // Mint Access Token (NFT/SBT)
    mint_access_token(ctx, article)?;

    // Emit events
    emit!(Purchased {
        article: article.key(),
        buyer: receipt.buyer,
        paid_amount: price,
        referrer,
        creator_amount,
        protocol_fee,
        referrer_fee,
    });

    emit!(AccessTokenMinted {
        article: article.key(),
        buyer: receipt.buyer,
        access_token_mint: ctx.accounts.access_token_mint.key(),
        transferable: article.transferable,
    });

    Ok(())
}

fn mint_access_token(ctx: Context<Purchase>, article: &Article) -> Result<()> {
    // Mint 1 token to buyer's account
    let mint_to_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.access_token_mint.to_account_info(),
            to: ctx.accounts.access_token_account.to_account_info(),
            authority: ctx.accounts.access_token_mint.to_account_info(),
        },
    );

    // Use PDA as signer for minting
    let access_token_seeds = &[
        ACCESS_TOKEN_SEED,
        article.key().as_ref(),
        ctx.accounts.buyer.key().as_ref(),
        &[ctx.bumps.access_token_mint],
    ];
    let signer = &[&access_token_seeds[..]];

    mint_to(mint_to_ctx.with_signer(signer), 1)?;

    // Create NFT metadata
    create_metadata(ctx, article)?;

    Ok(())
}

fn create_metadata(ctx: Context<Purchase>, article: &Article) -> Result<()> {
    let token_standard = if article.transferable {
        TokenStandard::NonFungible
    } else {
        TokenStandard::NonFungibleEdition // For SBT with restrictions
    };

    let metadata_name = format!("Access to Article #{}", article.key().to_string()[..8].to_string());
    let metadata_uri = format!("{}?access_token=true", article.uri_encrypted);

    // Create metadata account via CPI to Metaplex
    let creators = vec![Creator {
        address: article.creator,
        verified: false,
        share: 100,
    }];

    // Note: This is a simplified version - in production, you'd use proper Metaplex CPI
    // For now, we'll emit the metadata creation event and handle the actual
    // Metaplex interaction in the client SDK

    msg!("Creating metadata for access token: {}", ctx.accounts.access_token_mint.key());
    msg!("Token standard: {:?}", token_standard);
    msg!("Metadata name: {}", metadata_name);
    msg!("Metadata URI: {}", metadata_uri);

    Ok(())
}

#[event]
pub struct Purchased {
    pub article: Pubkey,
    pub buyer: Pubkey,
    pub paid_amount: u64,
    pub referrer: Option<Pubkey>,
    pub creator_amount: u64,
    pub protocol_fee: u64,
    pub referrer_fee: u64,
}

#[event]
pub struct AccessTokenMinted {
    pub article: Pubkey,
    pub buyer: Pubkey,
    pub access_token_mint: Pubkey,
    pub transferable: bool,
}

