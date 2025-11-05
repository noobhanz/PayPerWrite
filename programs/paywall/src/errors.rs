use anchor_lang::prelude::*;

#[error_code]
pub enum PaywallError {
    #[msg("URI exceeds maximum length")]
    UriTooLong,
    #[msg("Royalty basis points exceeds maximum")]
    InvalidRoyalty,
    #[msg("Price must be greater than 0")]
    InvalidPrice,
    #[msg("Only the creator can update the article")]
    Unauthorized,
    #[msg("Total fees exceed maximum basis points")]
    FeesTooHigh,
    #[msg("Payment mint does not match article payment mint")]
    InvalidPaymentMint,
    #[msg("Invalid referrer account")]
    InvalidReferrer,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Article not found")]
    ArticleNotFound,
    #[msg("Already purchased")]
    AlreadyPurchased,
    #[msg("Transfer blocked for SBT")]
    TransferBlocked,
    #[msg("Insufficient payment")]
    InsufficientPayment,
    #[msg("Account not rent exempt")]
    NotRentExempt,
}