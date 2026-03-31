import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-card shadow-card p-4 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
