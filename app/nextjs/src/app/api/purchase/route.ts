import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { getSDK } from '@/lib/solana';

export async function POST(request: NextRequest) {
  try {
    const { buyer, articleAddress, referrer } = await request.json();

    if (!buyer || !articleAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Create connection to devnet
    const connection = new Connection(
      'https://api.devnet.solana.com',
      'confirmed'
    );

    // Create a dummy wallet for server-side (we only need to build the tx, not sign)
    const dummyWallet = {
      publicKey: new PublicKey(buyer),
      signTransaction: async (tx: Transaction) => tx,
      signAllTransactions: async (txs: Transaction[]) => txs,
    } as Wallet;

    const provider = new AnchorProvider(connection, dummyWallet, {
      commitment: 'confirmed',
    });

    const sdk = getSDK(provider);

    // Mock article data - in production, fetch from on-chain
    const articleData = {
      creator: new PublicKey('Creator111111111111111111111111111111111'),
      articleSeq: { toNumber: () => 1 },
      uriEncrypted: 'lit-protocol://encrypted-content-hash-1',
      payMint: new PublicKey('So11111111111111111111111111111111111111112'),
      price: { toNumber: () => 1000000 },
      royaltyBps: 1000,
      transferable: false,
    };

    // Build the purchase transaction
    const tx = await sdk.purchase(
      new PublicKey(buyer),
      new PublicKey(articleAddress),
      new PublicKey('So11111111111111111111111111111111111111112'),
      articleData,
      referrer ? new PublicKey(referrer) : undefined
    );

    // Serialize the transaction and send back to client for signing
    const serializedTx = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return NextResponse.json({
      transaction: Buffer.from(serializedTx).toString('base64'),
    });
  } catch (error: any) {
    console.error('Error building purchase transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to build transaction' },
      { status: 500 }
    );
  }
}
