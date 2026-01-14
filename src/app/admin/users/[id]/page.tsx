'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, KeyRound } from 'lucide-react';
import Link from 'next/link';

type UserData = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  companyId: string | null;
  company: {
    id: string;
    name: string;
  } | null;
};

type CompanyOption = {
  id: string;
  name: string;
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Администратор',
  ANALYST: 'Аналитик',
  COMPANY: 'Компания',
};

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Основная информация
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  // Смена пароля
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    try {
      // Загружаем данные пользователя
      const userRes = await fetch(`/api/admin/users/${params.id}`);
      const userData = await userRes.json();
      setUser(userData);

      setName(userData.name);
      setEmail(userData.email);
      setRole(userData.role);
      setCompanyId(userData.companyId);
      setIsActive(userData.isActive);

      // Загружаем компании
      const companiesRes = await fetch('/api/admin/companies');
      const companiesData = await companiesRes.json();
      setCompanies(companiesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBasicInfo() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          companyId,
          isActive,
        }),
      });

      if (res.ok) {
        alert('Информация сохранена');
        loadData();
      } else {
        const error = await res.json();
        alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    setPasswordError('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (res.ok) {
        alert('Пароль изменён');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert('Ошибка при смене пароля');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Ошибка при смене пароля');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm('Вы уверены, что хотите деактивировать этого пользователя?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${params.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/admin/users');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert('Ошибка при деактивации');
    }
  }

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!user) {
    return <div>Пользователь не найден</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Badge variant={user.isActive ? 'default' : 'secondary'} className="ml-auto">
          {user.isActive ? 'Активен' : 'Неактивен'}
        </Badge>
      </div>

      {/* Основная информация */}
      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="role">Роль</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Администратор</SelectItem>
                  <SelectItem value="ANALYST">Аналитик</SelectItem>
                  <SelectItem value="COMPANY">Компания</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === 'COMPANY' && (
              <div>
                <Label htmlFor="company">Компания</Label>
                <Select
                  value={companyId || 'none'}
                  onValueChange={(value) => setCompanyId(value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите компанию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не привязан</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="isActive">Пользователь активен</Label>
            </div>
          </div>

          <Button onClick={handleSaveBasicInfo} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            Сохранить
          </Button>
        </CardContent>
      </Card>

      {/* Смена пароля */}
      <Card>
        <CardHeader>
          <CardTitle>Смена пароля</CardTitle>
          <CardDescription>
            Установите новый пароль для пользователя
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="newPassword">Новый пароль</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
              />
            </div>

            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>

          <Button onClick={handleResetPassword} disabled={saving} variant="outline">
            <KeyRound className="mr-2 h-4 w-4" />
            Сменить пароль
          </Button>
        </CardContent>
      </Card>

      {/* Дополнительная информация */}
      {user.company && (
        <Card>
          <CardHeader>
            <CardTitle>Информация о компании</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{user.company.name}</p>
                <p className="text-sm text-muted-foreground">ID: {user.company.id}</p>
              </div>
              <Link href={`/admin/companies/${user.company.id}`}>
                <Button variant="outline" size="sm">
                  Перейти к компании
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Опасные действия */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Опасная зона</CardTitle>
          <CardDescription>
            Необратимые действия с пользователем
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDeactivate} variant="destructive">
            Деактивировать пользователя
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
