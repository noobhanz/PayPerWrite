'use client';

import { useState } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getSDK } from '@/lib/solana';

interface PurchaseModalProps {
  article: {
    address: string;
    creator: string;
    uriEncrypted: string;
    price: number;
    mint: string;
    royaltyBps: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseModal({ article, onClose, onSuccess }: PurchaseModalProps) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [referrerAddress, setReferrerAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!publicKey || !anchorWallet) {
      setError('Wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new AnchorProvider(
        connection,
        anchorWallet,
        { commitment: 'confirmed' }
      );

      const sdk = getSDK(provider);
      const articlePubkey = new PublicKey(article.address);

      // Parse referrer if provided
      let referrer: PublicKey | undefined;
      if (referrerAddress.trim()) {
        try {
          referrer = new PublicKey(referrerAddress.trim());
        } catch {
          setError('Invalid referrer address');
          setLoading(false);
          return;
        }
      }

      // Mock article data for testing
      // In production, fetch this from the blockchain
      const articleData = {
        creator: new PublicKey(article.creator),
        articleSeq: { toNumber: () => 1 },
        uriEncrypted: article.uriEncrypted,
        payMint: new PublicKey(article.mint),
        price: { toNumber: () => article.price },
        royaltyBps: article.royaltyBps,
        transferable: false,
      };

      const tx = await sdk.purchase(
        publicKey,
        articlePubkey,
        new PublicKey(article.mint),
        articleData,
        referrer
      );

      const signature = await provider.sendAndConfirm(tx);
      console.log('Purchase successful! Signature:', signature);

      onSuccess();
    } catch (err: any) {
      console.error('Purchase failed:', err);
      setError(err.message || 'Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const priceInSOL = article.price / LAMPORTS_PER_SOL;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-white">Purchase Article</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Article</span>
              <span className="text-white font-mono text-sm">
                {article.address.slice(0, 8)}...{article.address.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Price</span>
              <span className="text-white font-bold text-lg">{priceInSOL.toFixed(4)} SOL</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Referrer Address (Optional)
            </label>
            <input
              type="text"
              value={referrerAddress}
              onChange={(e) => setReferrerAddress(e.target.value)}
              placeholder="Enter referrer wallet address"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              If you were referred by someone, enter their address to give them a reward
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}
