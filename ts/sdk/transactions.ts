import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import type { Paywall } from "../../target/types/paywall";

// PDA Seeds
const ARTICLE_SEED = Buffer.from("article");
const RECEIPT_SEED = Buffer.from("receipt");
const FEE_CONFIG_SEED = Buffer.from("fee_config");

export class PaywallSDK {
  constructor(
    public program: Program<Paywall>,
    public provider: AnchorProvider
  ) {}

  /**
   * Find Article PDA
   */
  findArticlePDA(creator: PublicKey, articleSeq: BN): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [ARTICLE_SEED, creator.toBuffer(), articleSeq.toArrayLike(Buffer, "le", 8)],
      this.program.programId
    );
  }

  /**
   * Find Receipt PDA
   */
  findReceiptPDA(article: PublicKey, buyer: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [RECEIPT_SEED, article.toBuffer(), buyer.toBuffer()],
      this.program.programId
    );
  }

  /**
   * Find FeeConfig PDA
   */
  findFeeConfigPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [FEE_CONFIG_SEED],
      this.program.programId
    );
  }

  /**
   * Create Article instruction
   */
  async createArticle(
    creator: PublicKey,
    articleSeq: BN,
    uriEncrypted: string,
    payMint: PublicKey,
    price: BN,
    royaltyBps: number,
    transferable: boolean
  ): Promise<TransactionInstruction> {
    const [article] = this.findArticlePDA(creator, articleSeq);

    return await this.program.methods
      .createArticle(
        articleSeq,
        uriEncrypted,
        payMint,
        price,
        royaltyBps,
        transferable
      )
      .accounts({
        creator,
        article,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Purchase Article instruction
   */
  async purchase(
    buyer: PublicKey,
    article: PublicKey,
    paymentMint: PublicKey,
    articleData: {
      creator: PublicKey;
    },
    referrer?: PublicKey
  ): Promise<TransactionInstruction> {
    const [receipt] = this.findReceiptPDA(article, buyer);
    const [feeConfig] = this.findFeeConfigPDA();

    // Fetch fee config to get treasury address
    const feeConfigAccount = await this.program.account.feeConfig.fetch(feeConfig);

    const buyerTokenAccount = getAssociatedTokenAddressSync(
      paymentMint,
      buyer,
      false
    );

    const creatorTokenAccount = getAssociatedTokenAddressSync(
      paymentMint,
      articleData.creator,
      false
    );

    const treasuryTokenAccount = getAssociatedTokenAddressSync(
      paymentMint,
      feeConfigAccount.treasury,
      false
    );

    const accounts: any = {
      buyer,
      article,
      receipt,
      feeConfig,
      paymentMint,
      buyerTokenAccount,
      creatorTokenAccount,
      treasuryTokenAccount,
      referrerTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    // Add referrer token account if provided
    if (referrer) {
      const referrerTokenAccount = getAssociatedTokenAddressSync(
        paymentMint,
        referrer,
        false
      );
      accounts.referrerTokenAccount = referrerTokenAccount;
    }

    return await this.program.methods
      .purchase(referrer || null)
      .accounts(accounts)
      .instruction();
  }

  /**
   * Set Article Price instruction
   */
  async setArticlePrice(
    creator: PublicKey,
    article: PublicKey,
    newPrice: BN
  ): Promise<TransactionInstruction> {
    return await this.program.methods
      .setArticlePrice(newPrice)
      .accounts({
        creator,
        article,
      })
      .instruction();
  }

  /**
   * Set Fee Config instruction (admin only)
   */
  async setFeeConfig(
    admin: PublicKey,
    protocolFeeBps: number,
    referrerFeeBps: number,
    treasury: PublicKey
  ): Promise<TransactionInstruction> {
    const [feeConfig] = this.findFeeConfigPDA();

    return await this.program.methods
      .setFeeConfig(protocolFeeBps, referrerFeeBps, treasury)
      .accounts({
        admin,
        feeConfig,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Fetch Article account
   */
  async getArticle(article: PublicKey) {
    return await this.program.account.article.fetch(article);
  }

  /**
   * Fetch Receipt account
   */
  async getReceipt(receipt: PublicKey) {
    return await this.program.account.receipt.fetch(receipt);
  }

  /**
   * Fetch Fee Config
   */
  async getFeeConfig() {
    const [feeConfig] = this.findFeeConfigPDA();
    return await this.program.account.feeConfig.fetch(feeConfig);
  }

  /**
   * Check if user has purchased an article
   */
  async hasPurchased(article: PublicKey, buyer: PublicKey): Promise<boolean> {
    const [receipt] = this.findReceiptPDA(article, buyer);
    try {
      await this.getReceipt(receipt);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Initialize SDK from IDL
 */
export function initializeSDK(
  provider: AnchorProvider,
  programId: PublicKey
): PaywallSDK {
  const idl = require("../../target/idl/paywall.json");
  const program = new Program(idl as Paywall, programId, provider);
  return new PaywallSDK(program, provider);
}
