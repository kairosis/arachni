import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Arachni — Graph Explorer',
  description: 'Kairosis event knowledge graph explorer',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', color: '#e5e5e5' }}>
        {children}
      </body>
    </html>
  );
}
