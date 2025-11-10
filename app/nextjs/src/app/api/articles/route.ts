import { NextResponse } from 'next/server';

// Mock article data - replace with actual on-chain data fetching
export async function GET() {
  const articles = [
    {
      address: 'Article1111111111111111111111111111111111',
      creator: 'Creator111111111111111111111111111111111',
      title: 'Introduction to Solana Development',
      uriEncrypted: 'lit-protocol://encrypted-content-hash-1',
      price: 1000000, // 0.001 SOL in lamports
      mint: 'So11111111111111111111111111111111111111112', // Native SOL
      royaltyBps: 1000, // 10%
    },
    {
      address: 'Article2222222222222222222222222222222222',
      creator: 'Creator222222222222222222222222222222222',
      title: 'Advanced Anchor Programming Patterns',
      uriEncrypted: 'lit-protocol://encrypted-content-hash-2',
      price: 2000000, // 0.002 SOL
      mint: 'So11111111111111111111111111111111111111112',
      royaltyBps: 500, // 5%
    },
  ];

  return NextResponse.json({ articles });
}
