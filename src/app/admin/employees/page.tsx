import { getEmployees } from '@/app/actions/users';
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

export default async function EmployeesPage() {
  const users = await getEmployees();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Сотрудники</h1>
          <p className="text-muted-foreground">Управление сотрудниками системы (Администраторы и Аналитики)</p>
        </div>
        <Link href="/admin/users/new?type=employee">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Добавить сотрудника
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все сотрудники</CardTitle>
          <CardDescription>
            Всего сотрудников: {users.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Назначенные компании</TableHead>
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
                    {(user.assignedCompanies && user.assignedCompanies.length > 0) ? (
                      <div className="flex flex-wrap gap-1">
                        {user.assignedCompanies.map((ac) => (
                          <Link 
                            key={ac.company.id}
                            href={`/admin/companies/${ac.company.id}`}
                          >
                            <Badge variant="secondary" className="hover:bg-secondary/80">
                              {ac.company.name}
                            </Badge>
                          </Link>
                        ))}
                      </div>
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
                    Нет сотрудников
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
