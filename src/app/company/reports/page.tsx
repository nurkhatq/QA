import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAudits } from '@/app/actions/audits';
import { getManagers } from '@/app/actions/managers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';
import { FileDown, TrendingUp, TrendingDown, Users } from 'lucide-react';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user.companyId) {
    return <div>Компания не найдена</div>;
  }

  // Получаем только завершённые аудиты
  const audits = await getAudits({
    companyId: session.user.companyId,
    status: 'COMPLETED',
  });

  // Получаем менеджеров компании
  const managers = await getManagers(session.user.companyId);

  // Группируем аудиты по менеджерам
  const auditsByManager = audits.reduce((acc, audit) => {
    const managerId = audit.managerId || 'unassigned';
    if (!acc[managerId]) {
      acc[managerId] = [];
    }
    acc[managerId].push(audit);
    return acc;
  }, {} as Record<string, typeof audits>);

  // Вычисляем статистику для каждого менеджера
  const managerStats = managers.map((manager) => {
    const managerAudits = auditsByManager[manager.id] || [];
    const totalScore = managerAudits.reduce((sum, audit) => sum + (audit.totalScore || 0), 0);
    const avgScore = managerAudits.length > 0 ? totalScore / managerAudits.length : 0;

    // Вычисляем тренд (сравниваем последние 2 аудита)
    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (managerAudits.length >= 2) {
      const sortedAudits = [...managerAudits].sort((a, b) =>
        new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime()
      );
      const latestScore = sortedAudits[0].totalScore || 0;
      const previousScore = sortedAudits[1].totalScore || 0;
      trend = latestScore > previousScore ? 'up' : latestScore < previousScore ? 'down' : 'neutral';
    }

    return {
      manager,
      audits: managerAudits,
      totalAudits: managerAudits.length,
      avgScore: Math.round(avgScore * 100) / 100,
      trend,
    };
  });

  // Аудиты без менеджера
  const unassignedAudits = auditsByManager['unassigned'] || [];
  const totalAudits = audits.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Отчёты аудита</h1>
          <p className="text-muted-foreground">
            Результаты аудитов качества коммуникаций по менеджерам
          </p>
        </div>
        <Card className="w-fit">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Всего аудитов</p>
                <p className="text-2xl font-bold">{totalAudits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Статистика и отчеты по менеджерам */}
      {managerStats.map((stat) => (
        <Card key={stat.manager.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{stat.manager.name}</CardTitle>
                <CardDescription>
                  Менеджер компании
                </CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Аудитов</p>
                  <p className="text-2xl font-bold">{stat.totalAudits}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Средний балл</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{stat.avgScore}%</p>
                    {stat.trend === 'up' && (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    )}
                    {stat.trend === 'down' && (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stat.audits.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип аудита</TableHead>
                    <TableHead>Дата проведения</TableHead>
                    <TableHead>Балл</TableHead>
                    <TableHead>Аналитик</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stat.audits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-medium">
                        {audit.version.questionnaire.name}
                      </TableCell>
                      <TableCell>{formatDateTime(audit.auditDate)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          (audit.totalScore || 0) >= 80 ? 'default' :
                          (audit.totalScore || 0) >= 60 ? 'secondary' : 'destructive'
                        }>
                          {audit.totalScore || 0}%
                        </Badge>
                      </TableCell>
                      <TableCell>{audit.analyst.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/company/reports/${audit.id}`}>
                            <Button variant="outline" size="sm">
                              Просмотр
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm">
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Нет завершённых аудитов для этого менеджера
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Аудиты без менеджера */}
      {unassignedAudits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Аудиты без менеджера</CardTitle>
            <CardDescription>
              Аудиты, не привязанные к конкретному менеджеру ({unassignedAudits.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип аудита</TableHead>
                  <TableHead>Дата проведения</TableHead>
                  <TableHead>Балл</TableHead>
                  <TableHead>Аналитик</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassignedAudits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">
                      {audit.version.questionnaire.name}
                    </TableCell>
                    <TableCell>{formatDateTime(audit.auditDate)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        (audit.totalScore || 0) >= 80 ? 'default' :
                        (audit.totalScore || 0) >= 60 ? 'secondary' : 'destructive'
                      }>
                        {audit.totalScore || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell>{audit.analyst.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/company/reports/${audit.id}`}>
                          <Button variant="outline" size="sm">
                            Просмотр
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalAudits === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Нет завершённых аудитов</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
