import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import { Paywall } from "../../target/types/paywall";
import { PaywallSDK, initializeSDK } from "../sdk";

describe("Paywall E2E Tests", () => {
  // Configure the client to use the local cluster
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Paywall as Program<Paywall>;
  const sdk = new PaywallSDK(program, provider);

  // Test accounts
  let paymentMint: PublicKey;
  let creator: Keypair;
  let buyer: Keypair;
  let treasury: Keypair;
  let referrer: Keypair;
  let admin: Keypair;

  // Test data
  const articleSeq = new BN(1);
  const uriEncrypted = "ar://encrypted-content-hash-12345";
  const price = new BN(1_000_000); // 1 USDC (6 decimals)
  const royaltyBps = 250; // 2.5%
  const protocolFeeBps = 200; // 2%
  const referrerFeeBps = 100; // 1%

  let articlePDA: PublicKey;
  let feeConfigPDA: PublicKey;

  before(async () => {
    // Initialize test accounts
    creator = Keypair.generate();
    buyer = Keypair.generate();
    treasury = Keypair.generate();
    referrer = Keypair.generate();
    admin = provider.wallet.publicKey;

    // Airdrop SOL to test accounts
    const airdropAmount = 10 * anchor.web3.LAMPORTS_PER_SOL;
    await Promise.all([
      provider.connection.requestAirdrop(creator.publicKey, airdropAmount),
      provider.connection.requestAirdrop(buyer.publicKey, airdropAmount),
      provider.connection.requestAirdrop(treasury.publicKey, airdropAmount),
      provider.connection.requestAirdrop(referrer.publicKey, airdropAmount),
    ]);

    // Wait for airdrops to confirm
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create payment token mint (simulating USDC)
    paymentMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6 // USDC decimals
    );

    // Create token accounts and mint tokens
    const creatorTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      paymentMint,
      creator.publicKey
    );

    const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      paymentMint,
      buyer.publicKey
    );

    const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      paymentMint,
      treasury.publicKey
    );

    const referrerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      paymentMint,
      referrer.publicKey
    );

    // Mint tokens to buyer (simulating buyer having USDC)
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      paymentMint,
      buyerTokenAccount.address,
      provider.wallet.publicKey,
      10_000_000 // 10 USDC
    );

    // Calculate PDAs
    [articlePDA] = sdk.findArticlePDA(creator.publicKey, articleSeq);
    [feeConfigPDA] = sdk.findFeeConfigPDA();
  });

  describe("Initialize Fee Config", () => {
    it("should initialize fee config", async () => {
      const tx = await program.methods
        .setFeeConfig(protocolFeeBps, referrerFeeBps, treasury.publicKey)
        .accounts({
          admin: admin,
          feeConfig: feeConfigPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Fee config initialized:", tx);

      // Verify fee config
      const feeConfig = await sdk.getFeeConfig();
      expect(feeConfig.protocolFeeBps).to.equal(protocolFeeBps);
      expect(feeConfig.referrerFeeBps).to.equal(referrerFeeBps);
      expect(feeConfig.treasury.toBase58()).to.equal(treasury.publicKey.toBase58());
    });
  });

  describe("Create Article", () => {
    it("should create an article", async () => {
      const tx = await program.methods
        .createArticle(
          articleSeq,
          uriEncrypted,
          paymentMint,
          price,
          royaltyBps,
          true // transferable
        )
        .accounts({
          creator: creator.publicKey,
          article: articlePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      console.log("Article created:", tx);

      // Verify article data
      const article = await sdk.getArticle(articlePDA);
      expect(article.creator.toBase58()).to.equal(creator.publicKey.toBase58());
      expect(article.uriEncrypted).to.equal(uriEncrypted);
      expect(article.payMint.toBase58()).to.equal(paymentMint.toBase58());
      expect(article.price.toNumber()).to.equal(price.toNumber());
      expect(article.royaltyBps).to.equal(royaltyBps);
      expect(article.transferable).to.equal(true);
      expect(article.sales.toNumber()).to.equal(0);
    });

    it("should fail to create article with invalid URI", async () => {
      const longUri = "a".repeat(300); // Exceeds MAX_URI_LENGTH
      const articleSeq2 = new BN(2);
      const [article2] = sdk.findArticlePDA(creator.publicKey, articleSeq2);

      try {
        await program.methods
          .createArticle(
            articleSeq2,
            longUri,
            paymentMint,
            price,
            royaltyBps,
            true
          )
          .accounts({
            creator: creator.publicKey,
            article: article2,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();

        assert.fail("Should have failed with URI too long");
      } catch (err) {
        expect(err.toString()).to.include("UriTooLong");
      }
    });

    it("should fail to create article with zero price", async () => {
      const articleSeq3 = new BN(3);
      const [article3] = sdk.findArticlePDA(creator.publicKey, articleSeq3);

      try {
        await program.methods
          .createArticle(
            articleSeq3,
            uriEncrypted,
            paymentMint,
            new BN(0), // zero price
            royaltyBps,
            true
          )
          .accounts({
            creator: creator.publicKey,
            article: article3,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();

        assert.fail("Should have failed with invalid price");
      } catch (err) {
        expect(err.toString()).to.include("InvalidPrice");
      }
    });
  });

  describe("Set Article Price", () => {
    it("should update article price", async () => {
      const newPrice = new BN(2_000_000); // 2 USDC

      const tx = await program.methods
        .setArticlePrice(newPrice)
        .accounts({
          creator: creator.publicKey,
          article: articlePDA,
        })
        .signers([creator])
        .rpc();

      console.log("Article price updated:", tx);

      // Verify updated price
      const article = await sdk.getArticle(articlePDA);
      expect(article.price.toNumber()).to.equal(newPrice.toNumber());
    });

    it("should fail if non-creator tries to update price", async () => {
      const newPrice = new BN(3_000_000);

      try {
        await program.methods
          .setArticlePrice(newPrice)
          .accounts({
            creator: buyer.publicKey, // Wrong creator
            article: articlePDA,
          })
          .signers([buyer])
          .rpc();

        assert.fail("Should have failed with unauthorized");
      } catch (err) {
        // Check for has_one constraint violation or unauthorized error
        const errStr = err.toString();
        expect(errStr.includes("Unauthorized") || errStr.includes("has_one") || errStr.includes("article")).to.be.true;
      }
    });
  });

  describe("Purchase Article", () => {
    let receiptPDA: PublicKey;
    let initialBuyerBalance: number;
    let initialCreatorBalance: number;
    let initialTreasuryBalance: number;

    before(async () => {
      // Reset price to original for purchase tests
      await program.methods
        .setArticlePrice(price)
        .accounts({
          creator: creator.publicKey,
          article: articlePDA,
        })
        .signers([creator])
        .rpc();

      // Get initial balances
      const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        buyer.publicKey
      );

      const creatorTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        creator.publicKey
      );

      const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        treasury.publicKey
      );

      initialBuyerBalance = Number((await getAccount(provider.connection, buyerTokenAccount.address)).amount);
      initialCreatorBalance = Number((await getAccount(provider.connection, creatorTokenAccount.address)).amount);
      initialTreasuryBalance = Number((await getAccount(provider.connection, treasuryTokenAccount.address)).amount);

      [receiptPDA] = sdk.findReceiptPDA(articlePDA, buyer.publicKey);
    });

    it("should purchase an article without referrer", async () => {
      const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        buyer.publicKey
      );

      const creatorTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        creator.publicKey
      );

      const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        treasury.publicKey
      );

      const tx = await program.methods
        .purchase(null)
        .accounts({
          buyer: buyer.publicKey,
          article: articlePDA,
          receipt: receiptPDA,
          feeConfig: feeConfigPDA,
          paymentMint: paymentMint,
          buyerTokenAccount: buyerTokenAccount.address,
          creatorTokenAccount: creatorTokenAccount.address,
          treasuryTokenAccount: treasuryTokenAccount.address,
          referrerTokenAccount: null,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      console.log("Article purchased:", tx);

      // Verify receipt
      const receipt = await sdk.getReceipt(receiptPDA);
      expect(receipt.article.toBase58()).to.equal(articlePDA.toBase58());
      expect(receipt.buyer.toBase58()).to.equal(buyer.publicKey.toBase58());
      expect(receipt.paidAmount.toNumber()).to.equal(price.toNumber());
      expect(receipt.purchasedAt.toNumber()).to.be.greaterThan(0);

      // Verify article sales count incremented
      const article = await sdk.getArticle(articlePDA);
      expect(article.sales.toNumber()).to.equal(1);

      // Verify balances
      const finalBuyerBalance = Number((await getAccount(provider.connection, buyerTokenAccount.address)).amount);
      const finalCreatorBalance = Number((await getAccount(provider.connection, creatorTokenAccount.address)).amount);
      const finalTreasuryBalance = Number((await getAccount(provider.connection, treasuryTokenAccount.address)).amount);

      const protocolFee = Math.floor((price.toNumber() * protocolFeeBps) / 10_000);
      const creatorAmount = price.toNumber() - protocolFee;

      expect(finalBuyerBalance).to.equal(initialBuyerBalance - price.toNumber());
      expect(finalCreatorBalance).to.equal(initialCreatorBalance + creatorAmount);
      expect(finalTreasuryBalance).to.equal(initialTreasuryBalance + protocolFee);
    });

    it("should verify user has purchased article", async () => {
      const hasPurchased = await sdk.hasPurchased(articlePDA, buyer.publicKey);
      expect(hasPurchased).to.be.true;
    });

    it("should fail to purchase same article twice", async () => {
      const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        buyer.publicKey
      );

      const creatorTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        creator.publicKey
      );

      const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        treasury.publicKey
      );

      try {
        await program.methods
          .purchase(null)
          .accounts({
            buyer: buyer.publicKey,
            article: articlePDA,
            receipt: receiptPDA,
            feeConfig: feeConfigPDA,
            paymentMint: paymentMint,
            buyerTokenAccount: buyerTokenAccount.address,
            creatorTokenAccount: creatorTokenAccount.address,
            treasuryTokenAccount: treasuryTokenAccount.address,
            referrerTokenAccount: null,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();

        assert.fail("Should have failed with account already exists");
      } catch (err) {
        // Receipt PDA already exists, so init should fail
        expect(err.toString()).to.include("already in use");
      }
    });

    it("should purchase with referrer and distribute fees correctly", async () => {
      // Create a new article for this test
      const articleSeq4 = new BN(4);
      const [article4] = sdk.findArticlePDA(creator.publicKey, articleSeq4);

      await program.methods
        .createArticle(
          articleSeq4,
          uriEncrypted,
          paymentMint,
          price,
          royaltyBps,
          true
        )
        .accounts({
          creator: creator.publicKey,
          article: article4,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Get token accounts
      const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        buyer.publicKey
      );

      const creatorTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        creator.publicKey
      );

      const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        treasury.publicKey
      );

      const referrerTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        paymentMint,
        referrer.publicKey
      );

      // Get initial balances
      const initialReferrerBalance = Number((await getAccount(provider.connection, referrerTokenAccount.address)).amount);
      const initialCreatorBalance4 = Number((await getAccount(provider.connection, creatorTokenAccount.address)).amount);
      const initialTreasuryBalance4 = Number((await getAccount(provider.connection, treasuryTokenAccount.address)).amount);

      const [receipt4] = sdk.findReceiptPDA(article4, buyer.publicKey);

      const tx = await program.methods
        .purchase(referrer.publicKey)
        .accounts({
          buyer: buyer.publicKey,
          article: article4,
          receipt: receipt4,
          feeConfig: feeConfigPDA,
          paymentMint: paymentMint,
          buyerTokenAccount: buyerTokenAccount.address,
          creatorTokenAccount: creatorTokenAccount.address,
          treasuryTokenAccount: treasuryTokenAccount.address,
          referrerTokenAccount: referrerTokenAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      console.log("Article purchased with referrer:", tx);

      // Verify balances with referrer fee
      const finalReferrerBalance = Number((await getAccount(provider.connection, referrerTokenAccount.address)).amount);
      const finalCreatorBalance = Number((await getAccount(provider.connection, creatorTokenAccount.address)).amount);
      const finalTreasuryBalance = Number((await getAccount(provider.connection, treasuryTokenAccount.address)).amount);

      const protocolFee = Math.floor((price.toNumber() * protocolFeeBps) / 10_000);
      const referrerFee = Math.floor((price.toNumber() * referrerFeeBps) / 10_000);
      const creatorAmount = price.toNumber() - protocolFee - referrerFee;

      expect(finalReferrerBalance).to.equal(initialReferrerBalance + referrerFee);
      expect(finalCreatorBalance).to.equal(initialCreatorBalance4 + creatorAmount);
      expect(finalTreasuryBalance).to.equal(initialTreasuryBalance4 + protocolFee);
    });
  });

  describe("Update Fee Config", () => {
    it("should update fee config", async () => {
      const newProtocolFee = 300; // 3%
      const newReferrerFee = 150; // 1.5%

      const tx = await program.methods
        .setFeeConfig(newProtocolFee, newReferrerFee, treasury.publicKey)
        .accounts({
          admin: admin,
          feeConfig: feeConfigPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Fee config updated:", tx);

      // Verify updated fee config
      const feeConfig = await sdk.getFeeConfig();
      expect(feeConfig.protocolFeeBps).to.equal(newProtocolFee);
      expect(feeConfig.referrerFeeBps).to.equal(newReferrerFee);
    });
  });
});
