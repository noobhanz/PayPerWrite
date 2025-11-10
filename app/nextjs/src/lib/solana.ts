import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { PaywallSDK } from '@/sdk/transactions';
import idl from '@/sdk/idl/paywall.json';

export const PROGRAM_ID = new PublicKey(idl.address);

export function getProgram(provider: AnchorProvider): Program<any> {
  return new Program(idl as any, provider);
}

export function getSDK(provider: AnchorProvider): PaywallSDK {
  const program = getProgram(provider);
  return new PaywallSDK(program, provider);
}

export async function getArticleData(
  connection: Connection,
  articleAddress: PublicKey
) {
  const program = getProgram(
    new AnchorProvider(
      connection,
      {} as any,
      { commitment: 'confirmed' }
    )
  );

  try {
    const article = await program.account.article.fetch(articleAddress);
    return article;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}
