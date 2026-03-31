import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-lg mx-auto pb-20 px-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
