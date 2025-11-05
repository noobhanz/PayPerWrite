# Overview

A decentralized pay-per-article/content marketplace on Solana.
Buyers pay per item (no subscription). Access is granted via an on-chain purchase
that mints an access token (NFT or SBT). Content remains encrypted on Arweave/IPFS
and is decrypted client-side using Lit Protocol when the buyer's wallet satisfies
the access condition.

## Core Flows
1. Creator mints Article metadata pointing to encrypted content URI.
2. Buyer purchases the Article (USDC SPL). Contract mints an access token and records a Receipt.
3. Frontend verifies access and requests Lit to release the decryption key.
4. Buyer reads content; protocol fees and splits are distributed.