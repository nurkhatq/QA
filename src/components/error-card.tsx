import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorCard({ 
  title = 'Ошибка загрузки', 
  message = 'Не удалось загрузить данные. Попробуйте еще раз.',
  onRetry 
}: ErrorCardProps) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">{title}</CardTitle>
        </div>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent>
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Попробовать снова
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export function FullPageError({ 
  title = 'Ошибка', 
  message = 'Что-то пошло не так',
  onRetry 
}: ErrorCardProps) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="max-w-md w-full px-4">
        <ErrorCard title={title} message={message} onRetry={onRetry} />
      </div>
    </div>
  );
}
