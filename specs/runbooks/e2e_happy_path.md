# E2E Happy Path

1) Creator calls create_article -> gets Article PDA.
2) Buyer calls purchase with USDC -> escrowed, fees split, access token minted.
3) Frontend checks ownership -> requests Lit key -> decrypt content.
4) Buyer reads content; Receipt is recorded.