'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createUser } from '@/app/actions/users';
import { getCompanies } from '@/app/actions/companies';

export default function NewUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmployeeMode = searchParams.get('type') === 'employee';
  const preselectedCompanyId = searchParams.get('companyId');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(isEmployeeMode ? 'ANALYST' : 'COMPANY');
  const [companyId, setCompanyId] = useState(preselectedCompanyId || '');
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadCompanies() {
      const data = await getCompanies();
      setCompanies(data);
    }
    loadCompanies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createUser({
        email,
        password,
        name,
        role: role as any,
        companyId: role === 'COMPANY' ? companyId : undefined,
      });

      if (preselectedCompanyId) {
        router.push(`/admin/companies/${preselectedCompanyId}`);
      } else {
        router.push(isEmployeeMode ? '/admin/employees' : '/admin/users');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(error.message || 'Ошибка при создании пользователя');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{isEmployeeMode ? 'Новый сотрудник' : 'Новый пользователь'}</h1>
          <p className="text-muted-foreground">{isEmployeeMode ? 'Добавление администратора или аналитика' : 'Добавление пользователя компании'}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Данные пользователя</CardTitle>
          <CardDescription>
            Заполните информацию о новом пользователе
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Иван Иванов"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Минимум 6 символов"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Роль *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isEmployeeMode ? (
                    <>
                      <SelectItem value="ANALYST">Аналитик</SelectItem>
                      <SelectItem value="ADMIN">Администратор</SelectItem>
                    </>
                  ) : (
                    <SelectItem value="COMPANY">Компания</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {role === 'COMPANY' && (
              <div className="space-y-2">
                <Label htmlFor="company">Компания *</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите компанию" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading || (role === 'COMPANY' && !companyId)}
              >
                {isLoading ? 'Создание...' : 'Создать пользователя'}
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
