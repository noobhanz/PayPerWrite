use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::PaywallError;

#[derive(Accounts)]
#[instruction(article_seq: u64)]
pub struct CreateArticle<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = ARTICLE_SIZE,
        seeds = [ARTICLE_SEED, creator.key().as_ref(), &article_seq.to_le_bytes()],
        bump
    )]
    pub article: Account<'info, Article>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateArticle>, 
    _article_seq: u64,
    uri_encrypted: String, 
    pay_mint: Pubkey, 
    price: u64, 
    royalty_bps: u16, 
    transferable: bool
) -> Result<()> {
    require!(uri_encrypted.len() <= MAX_URI_LENGTH, PaywallError::UriTooLong);
    require!(royalty_bps <= MAX_BASIS_POINTS, PaywallError::InvalidRoyalty);
    require!(price > 0, PaywallError::InvalidPrice);

    let article = &mut ctx.accounts.article;
    article.creator = ctx.accounts.creator.key();
    article.uri_encrypted = uri_encrypted;
    article.pay_mint = pay_mint;
    article.price = price;
    article.royalty_bps = royalty_bps;
    article.transferable = transferable;
    article.sales = 0;

    emit!(ArticleCreated {
        article: article.key(),
        creator: article.creator,
        pay_mint: article.pay_mint,
        price: article.price,
        royalty_bps: article.royalty_bps,
        transferable: article.transferable,
    });

    Ok(())
}

#[event]
pub struct ArticleCreated {
    pub article: Pubkey,
    pub creator: Pubkey,
    pub pay_mint: Pubkey,
    pub price: u64,
    pub royalty_bps: u16,
    pub transferable: bool,
}

