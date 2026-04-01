import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-accent text-white hover:opacity-90',
    secondary: 'bg-surface2 text-label hover:bg-surface border border-surface2',
    danger: 'bg-danger text-white hover:opacity-90',
    ghost: 'bg-transparent text-accent hover:bg-surface',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-base', lg: 'px-6 py-3 text-lg' };
  return (
    <button
      {...props}
      className={`${variants[variant]} ${sizes[size]} rounded-xl font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
