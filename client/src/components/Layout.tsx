// client/src/components/Layout.tsx
import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <main className="w-full max-w-lg mx-auto pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
