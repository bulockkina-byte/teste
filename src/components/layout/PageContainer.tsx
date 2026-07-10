import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="animate-fadeIn space-y-6 p-6 pt-5">
      {children}
    </div>
  );
}
