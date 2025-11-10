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

      try {
        const response = await fetch('/api/articles');
        const data = await response.json();

        setArticles(data.articles.map((article: any) => ({
          ...article,
          isPurchased: false, // TODO: Check on-chain if user has purchased
        })));
      } catch (error) {
        console.error('Error loading articles:', error);
        setArticles([]);
      } finally {
        setLoading(false);
      }
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
