'use client';

import { useState } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PurchaseModal } from './PurchaseModal';

interface ArticleCardProps {
  article: {
    address: string;
    creator: string;
    uriEncrypted: string;
    price: number;
    mint: string;
    royaltyBps: number;
    isPurchased: boolean;
  };
}

export function ArticleCard({ article }: ArticleCardProps) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isPurchased, setIsPurchased] = useState(article.isPurchased);

  const priceInSOL = article.price / LAMPORTS_PER_SOL;
  const royaltyPercentage = article.royaltyBps / 100;

  const handlePurchaseSuccess = () => {
    setIsPurchased(true);
    setShowPurchaseModal(false);
  };

  return (
    <>
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500 transition-colors">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">
                Premium Article #{article.address.slice(0, 8)}
              </h3>
              <p className="text-sm text-gray-400">
                By {article.creator.slice(0, 8)}...{article.creator.slice(-4)}
              </p>
            </div>
            {isPurchased && (
              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                Owned
              </span>
            )}
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Price</span>
              <span className="text-white font-semibold">{priceInSOL.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Creator Royalty</span>
              <span className="text-white">{royaltyPercentage}%</span>
            </div>
          </div>

          {isPurchased ? (
            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              onClick={() => {
                // TODO: Implement content viewing
                alert('Content decryption coming soon!');
              }}
            >
              View Content
            </button>
          ) : (
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              onClick={() => setShowPurchaseModal(true)}
            >
              Purchase Access
            </button>
          )}
        </div>
      </div>

      {showPurchaseModal && (
        <PurchaseModal
          article={article}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </>
  );
}
