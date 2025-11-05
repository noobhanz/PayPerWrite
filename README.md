# Solana Pay-Per-Article Marketplace (Multi-Agent Repo)

This repository scaffolds a decentralized pay-per-article/content platform on Solana (Rust + Anchor).
Readers buy single articles/posts. Creators upload encrypted content (Arweave/IPFS). Access is unlocked
by on-chain purchase (NFT or SBT access token) gated via Lit Protocol.

This repo is designed for multi-agent development: each agent has a role spec (`/agents`), execution prompt (`/prompts`),
and shared interface contracts (`/specs`). CI enforces that code changes match the specs.

## High-level features
- One-time purchase for a single article or asset
- Token-gated decryption (Lit Protocol) for encrypted content stored on Arweave/IPFS
- On-chain receipts and access tokens (transferable NFT or non-transferable SBT)
- Protocol fee splits, optional referral
- Simple marketplace page, Solana Pay deep links

## Tooling
- Solana 1.18+ / Agave 2.x
- Anchor >= 0.30 (SBF builds)
- Rust (on-chain), TypeScript (SDK/tests), Next.js (frontend)