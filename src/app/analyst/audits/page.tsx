import { getAudits } from '@/app/actions/audits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { ClientDate } from '@/components/ui/client-date';

const statusLabels = {
  DRAFT: { label: 'Черновик', variant: 'secondary' as const },
  COMPLETED: { label: 'Завершён', variant: 'default' as const },
};

export default async function AuditsPage() {
  const audits = await getAudits();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Мои аудиты</h1>
          <p className="text-muted-foreground">Управление аудитами</p>
        </div>
        <Link href="/analyst/audits/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Новый аудит
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все аудиты</CardTitle>
          <CardDescription>
            Всего аудитов: {audits.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Компания</TableHead>
                <TableHead>Менеджер</TableHead>
                <TableHead>Анкета</TableHead>
                <TableHead>Дата аудита</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map((audit) => (
                <TableRow key={audit.id}>
                  <TableCell className="font-medium">{audit.company.name}</TableCell>
                  <TableCell>{audit.manager?.name || '—'}</TableCell>
                  <TableCell>{audit.version.questionnaire.name}</TableCell>
                  <TableCell>
                    <ClientDate date={audit.auditDate} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusLabels[audit.status].variant}>
                      {statusLabels[audit.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/analyst/audits/${audit.id}`}>
                      <Button variant="outline" size="sm">
                        {audit.status === 'DRAFT' ? 'Продолжить' : 'Просмотр'}
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {audits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Нет аудитов
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
