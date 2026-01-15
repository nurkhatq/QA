import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Star, Check } from 'lucide-react';

interface SelectionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  stats?: string;
  isRecent?: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  className?: string;
}

export function SelectionCard({
  icon,
  title,
  subtitle,
  stats,
  isRecent = false,
  isSelected = false,
  onSelect,
  className,
}: SelectionCardProps) {
  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all hover:shadow-lg hover:scale-105',
        isSelected && 'ring-2 ring-primary shadow-lg',
        className
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        {/* Icon and badges */}
        <div className="flex items-start justify-between">
          <div className="text-4xl">{icon}</div>
          <div className="flex gap-1">
            {isRecent && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Недавние
              </Badge>
            )}
            {isSelected && (
              <div className="bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-semibold text-base line-clamp-1">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground line-clamp-1">{subtitle}</p>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <p className="text-xs text-muted-foreground">{stats}</p>
        )}

        {/* Select button */}
        <Button
          size="sm"
          variant={isSelected ? 'default' : 'outline'}
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? 'Выбрано' : 'Выбрать'}
        </Button>
      </CardContent>
    </Card>
  );
}
