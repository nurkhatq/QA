'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createCompany } from '@/app/actions/companies';

export default function NewCompanyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connectionDate, setConnectionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newCompany = await createCompany({
        name,
        description: description || undefined,
        connectionDate: new Date(connectionDate),
      });

      router.push(`/admin/companies/${newCompany.id}`);
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Ошибка при создании компании');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/companies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Новая компания</h1>
          <p className="text-muted-foreground">Добавление новой компании в систему</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация о компании</CardTitle>
          <CardDescription>
            Заполните основные данные компании
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название компании *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="ООО Компания"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткое описание компании..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connectionDate">Дата подключения *</Label>
              <Input
                id="connectionDate"
                type="date"
                value={connectionDate}
                onChange={(e) => setConnectionDate(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Используется для отслеживания ежемесячных платежей
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Создание...' : 'Создать компанию'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Отмена
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
