'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ArticleList } from '@/components/ArticleList';

export default function Home() {
  const { connected } = useWallet();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <nav className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">PayPerWrite</h1>
          <WalletMultiButton />
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {connected ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                Premium Articles
              </h2>
              <p className="text-gray-400">
                Purchase access to encrypted content with Solana tokens
              </p>
            </div>
            <ArticleList />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <h2 className="text-4xl font-bold text-white mb-4">
                Welcome to PayPerWrite
              </h2>
              <p className="text-gray-400 mb-8">
                Connect your Solana wallet to access premium encrypted articles
              </p>
              <WalletMultiButton />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
