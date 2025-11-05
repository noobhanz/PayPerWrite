use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PaywallError;

#[derive(Accounts)]
pub struct SetArticlePrice<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        has_one = creator @ PaywallError::Unauthorized
    )]
    pub article: Account<'info, Article>,
}

pub fn handler(ctx: Context<SetArticlePrice>, price: u64) -> Result<()> {
    require!(price > 0, PaywallError::InvalidPrice);
    
    let article = &mut ctx.accounts.article;
    article.price = price;

    emit!(ArticleUpdated {
        article: article.key(),
        price,
    });

    Ok(())
}

#[event]
pub struct ArticleUpdated {
    pub article: Pubkey,
    pub price: u64,
}

