use anchor_lang::prelude::*;

#[account]
pub struct Article {
    pub creator: Pubkey,
    pub uri_encrypted: String,
    pub pay_mint: Pubkey,
    pub price: u64,
    pub royalty_bps: u16,
    pub transferable: bool,
    pub sales: u64,
}

#[account]
pub struct Receipt {
    pub article: Pubkey,
    pub buyer: Pubkey,
    pub paid_amount: u64,
    pub purchased_at: i64,
}

#[account]
pub struct FeeConfig {
    pub protocol_fee_bps: u16,
    pub referrer_fee_bps: u16,
    pub treasury: Pubkey,
}