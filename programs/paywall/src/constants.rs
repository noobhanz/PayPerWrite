use anchor_lang::prelude::*;

pub const ARTICLE_SEED: &[u8] = b"article";
pub const RECEIPT_SEED: &[u8] = b"receipt";
pub const FEE_CONFIG_SEED: &[u8] = b"fee_config";
pub const ACCESS_TOKEN_SEED: &[u8] = b"access_token";

pub const MAX_URI_LENGTH: usize = 200;
pub const MAX_BASIS_POINTS: u16 = 10_000;

pub const ARTICLE_SIZE: usize = 8 + 32 + 4 + MAX_URI_LENGTH + 32 + 8 + 2 + 1 + 8;
pub const RECEIPT_SIZE: usize = 8 + 32 + 32 + 8 + 8;
pub const FEE_CONFIG_SIZE: usize = 8 + 2 + 2 + 32;