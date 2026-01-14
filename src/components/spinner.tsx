import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <Loader2 
      className={cn('animate-spin text-primary', sizeClasses[size], className)} 
    />
  );
}

export function LoadingSpinner({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
      <Spinner size="lg" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

export function FullPageSpinner({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <Spinner size="lg" />
      <p className="text-lg text-muted-foreground">{text}</p>
    </div>
  );
}
