import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-card p-4 border border-surface2 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
