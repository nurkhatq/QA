import { getUsers } from '@/app/actions/users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus } from 'lucide-react';

const roleLabels: Record<string, string> = {
  ADMIN: 'Администратор',
  ANALYST: 'Аналитик',
  COMPANY: 'Компания',
};

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Пользователи</h1>
          <p className="text-muted-foreground">Управление пользователями системы</p>
        </div>
        <Link href="/admin/users/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Добавить пользователя
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все пользователи</CardTitle>
          <CardDescription>
            Всего пользователей: {users.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Компания</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{roleLabels[user.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.company ? (
                      <Link
                        href={`/admin/companies/${user.company.id}`}
                        className="text-primary hover:underline"
                      >
                        {user.company.name}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Активен' : 'Неактивен'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/users/${user.id}`}>
                      <Button variant="outline" size="sm">
                        Редактировать
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Нет пользователей
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
