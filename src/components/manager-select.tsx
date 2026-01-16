import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCachedManagers, Manager } from '@/lib/analyst-cache';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface ManagerSelectProps {
  companyId: string;
  selectedManagerId: string | undefined | null;
  onSelect: (managerId: string) => void;
  disabled?: boolean;
}

export function ManagerSelect({ companyId, selectedManagerId, onSelect, disabled }: ManagerSelectProps) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadManagers = async () => {
      setIsLoading(true);
      try {
        const data = await getCachedManagers(companyId);
        setManagers(data);
      } catch (error) {
        console.error('Failed to load managers:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить список менеджеров',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (companyId) {
      loadManagers();
    }
  }, [companyId]);

  return (
    <div className="space-y-2">
      <Label>Менеджер</Label>
      <Select 
        value={selectedManagerId || ''} 
        onValueChange={onSelect} 
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Загрузка..." : "Выберите менеджера"} />
        </SelectTrigger>
        <SelectContent>
          {managers.map((manager) => (
            <SelectItem key={manager.id} value={manager.id}>
              {manager.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
