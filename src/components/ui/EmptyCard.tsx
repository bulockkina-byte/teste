import { type LucideIcon } from 'lucide-react';

interface EmptyCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyCard({ icon: Icon, title, description }: EmptyCardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-graphite-700 dark:bg-graphite-900">
      <div className="mb-4 rounded-full bg-aviation-50 p-4 dark:bg-aviation-900/30">
        <Icon className="h-10 w-10 text-aviation-600 dark:text-aviation-400" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-graphite-900 dark:text-graphite-100">
        {title}
      </h3>
      <p className="max-w-md text-sm text-graphite-500 dark:text-graphite-400">
        {description}
      </p>
    </div>
  );
}
