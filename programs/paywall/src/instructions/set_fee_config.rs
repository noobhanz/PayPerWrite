use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::PaywallError;

#[derive(Accounts)]
pub struct SetFeeConfig<'info> {
    #[account(mut, address = admin::ID)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = FEE_CONFIG_SIZE,
        seeds = [FEE_CONFIG_SEED],
        bump
    )]
    pub fee_config: Account<'info, FeeConfig>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SetFeeConfig>, 
    protocol_fee_bps: u16, 
    referrer_fee_bps: u16, 
    treasury: Pubkey
) -> Result<()> {
    require!(protocol_fee_bps + referrer_fee_bps <= MAX_BASIS_POINTS, PaywallError::FeesTooHigh);

    let fee_config = &mut ctx.accounts.fee_config;
    fee_config.protocol_fee_bps = protocol_fee_bps;
    fee_config.referrer_fee_bps = referrer_fee_bps;
    fee_config.treasury = treasury;

    emit!(FeeUpdated {
        protocol_fee_bps,
        referrer_fee_bps,
        treasury,
    });

    Ok(())
}

#[event]
pub struct FeeUpdated {
    pub protocol_fee_bps: u16,
    pub referrer_fee_bps: u16,
    pub treasury: Pubkey,
}


mod admin {
    use anchor_lang::prelude::*;
    declare_id!("Admin11111111111111111111111111111111111111");
}