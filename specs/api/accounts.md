# Accounts (Human-Readable)

## Article
PDA: ["article", creator, article_seq]
Fields:
- creator: Pubkey
- uri_encrypted: String            # Arweave/IPFS CID
- pay_mint: Pubkey                 # SPL token (e.g., USDC)
- price: u64                       # smallest units
- royalty_bps: u16                 # creator or splits
- transferable: bool               # true -> NFT, false -> SBT
- sales: u64                       # number of purchases

## Receipt
PDA: ["receipt", article, buyer]
Fields:
- article: Pubkey
- buyer: Pubkey
- paid_amount: u64
- purchased_at: i64

## AccessToken (metadata off-chain via Metaplex)
- Minted on purchase. If SBT, token is non-transferable (transfer hook checks).
- For NFT mode, follows Metaplex NFT standard.

## FeeConfig
PDA: ["fee_config"]
Fields:
- protocol_fee_bps: u16
- referrer_fee_bps: u16
- treasury: Pubkey