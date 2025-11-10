'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { ArticleCard } from './ArticleCard';

interface Article {
  address: string;
  creator: string;
  uriEncrypted: string;
  price: number;
  mint: string;
  royaltyBps: number;
  isPurchased: boolean;
}

export function ArticleList() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArticles() {
      setLoading(true);

      // TODO: Fetch actual articles from program accounts
      // For now, using mock data for UI development
      const mockArticles: Article[] = [
        {
          address: 'Article1111111111111111111111111111111111',
          creator: 'Creator111111111111111111111111111111111',
          uriEncrypted: 'lit-protocol://encrypted-content-hash-1',
          price: 1000000, // 0.001 SOL (in lamports)
          mint: 'So11111111111111111111111111111111111111112', // Native SOL
          royaltyBps: 1000, // 10%
          isPurchased: false,
        },
        {
          address: 'Article2222222222222222222222222222222222',
          creator: 'Creator222222222222222222222222222222222',
          uriEncrypted: 'lit-protocol://encrypted-content-hash-2',
          price: 2000000, // 0.002 SOL
          mint: 'So11111111111111111111111111111111111111112',
          royaltyBps: 500, // 5%
          isPurchased: false,
        },
      ];

      setArticles(mockArticles);
      setLoading(false);
    }

    if (publicKey) {
      loadArticles();
    }
  }, [connection, publicKey]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No articles available yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <ArticleCard key={article.address} article={article} />
      ))}
    </div>
  );
}
