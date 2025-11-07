use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::constants::*;
use crate::errors::PaywallError;

#[derive(Accounts)]
#[instruction(referrer: Option<Pubkey>)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub article: Box<Account<'info, Article>>,
    #[account(
        init,
        payer = buyer,
        space = RECEIPT_SIZE,
        seeds = [RECEIPT_SEED, article.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub receipt: Box<Account<'info, Receipt>>,
    #[account(
        seeds = [FEE_CONFIG_SEED],
        bump
    )]
    pub fee_config: Box<Account<'info, FeeConfig>>,
    pub payment_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        associated_token::mint = payment_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = payment_mint,
        associated_token::authority = article.creator
    )]
    pub creator_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = payment_mint,
        associated_token::authority = fee_config.treasury
    )]
    pub treasury_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub referrer_token_account: Option<Box<Account<'info, TokenAccount>>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Purchase>, referrer: Option<Pubkey>) -> Result<()> {
    let article_key = ctx.accounts.article.key();
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
    receipt.article = article_key;
    receipt.buyer = ctx.accounts.buyer.key();
    receipt.paid_amount = price;
    receipt.purchased_at = Clock::get()?.unix_timestamp;

    // Update article sales count
    article.sales = article.sales.checked_add(1).ok_or(PaywallError::Overflow)?;

    // Emit event
    emit!(Purchased {
        article: article_key,
        buyer: receipt.buyer,
        paid_amount: price,
        referrer,
        creator_amount,
        protocol_fee,
        referrer_fee,
    });

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

