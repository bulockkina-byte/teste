import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-aviation-500/50 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-aviation-600 text-white hover:bg-aviation-700 active:bg-aviation-800 dark:bg-aviation-500 dark:hover:bg-aviation-600',
    secondary:
      'bg-graphite-100 text-graphite-800 hover:bg-graphite-200 dark:bg-graphite-800 dark:text-graphite-100 dark:hover:bg-graphite-700',
    ghost:
      'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-400 dark:hover:bg-graphite-800',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
