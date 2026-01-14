import { getCompanies } from '@/app/actions/companies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Компании</h1>
          <p className="text-muted-foreground">Управление компаниями в системе</p>
        </div>
        <Link href="/admin/companies/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Добавить компанию
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все компании</CardTitle>
          <CardDescription>
            Всего компаний: {companies.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Дата подключения</TableHead>
                <TableHead>Пользователи</TableHead>
                <TableHead>Анкеты</TableHead>
                <TableHead>Аудиты</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{formatDate(company.connectionDate)}</TableCell>
                  <TableCell>{company._count.users}</TableCell>
                  <TableCell>{company._count.questionnaires}</TableCell>
                  <TableCell>{company._count.audits}</TableCell>
                  <TableCell>
                    <Badge variant={company.isActive ? 'default' : 'secondary'}>
                      {company.isActive ? 'Активна' : 'Неактивна'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/companies/${company.id}`}>
                      <Button variant="outline" size="sm">
                        Подробнее
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {companies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Нет компаний
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
