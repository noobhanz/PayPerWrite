import type { Metadata } from 'next';
import '../styles/globals.css';
import { WalletProvider } from '@/components/WalletProvider';

export const metadata: Metadata = {
  title: 'PayPerWrite - Solana Pay-Per-Article Marketplace',
  description: 'Purchase and access premium encrypted articles with Solana',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
