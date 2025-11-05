//! Pay-per-article program skeleton (Anchor)

use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod utils;
pub mod constants;
pub mod errors;

pub use errors::*;

use instructions::*;

declare_id!("3psatBaDW49GpyZTcwcQENW6MUK8rQ6NFmJy9EE1NrvH");

#[program]
pub mod paywall {
    use super::*;

    pub fn create_article(ctx: Context<CreateArticle>, article_seq: u64, uri_encrypted: String, pay_mint: Pubkey, price: u64, royalty_bps: u16, transferable: bool) -> Result<()> {
        instructions::create_article::handler(ctx, article_seq, uri_encrypted, pay_mint, price, royalty_bps, transferable)
    }

    pub fn purchase(ctx: Context<Purchase>, referrer: Option<Pubkey>) -> Result<()> {
        instructions::purchase::handler(ctx, referrer)
    }

    pub fn set_article_price(ctx: Context<SetArticlePrice>, price: u64) -> Result<()> {
        instructions::set_article_price::handler(ctx, price)
    }

    pub fn set_fee_config(ctx: Context<SetFeeConfig>, protocol_fee_bps: u16, referrer_fee_bps: u16, treasury: Pubkey) -> Result<()> {
        instructions::set_fee_config::handler(ctx, protocol_fee_bps, referrer_fee_bps, treasury)
    }
}