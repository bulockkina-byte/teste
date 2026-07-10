import type { LucideIcon } from 'lucide-react';

interface PageTitleProps {
  icon: LucideIcon;
  title: string;
}

export function PageTitle({ icon: Icon, title }: PageTitleProps) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="rounded-lg bg-aviation-50 p-2 dark:bg-aviation-900/30">
        <Icon className="h-6 w-6 text-aviation-600 dark:text-aviation-400" />
      </div>
      <h1 className="text-2xl font-bold text-graphite-900 dark:text-graphite-100">
        {title}
      </h1>
    </div>
  );
}
