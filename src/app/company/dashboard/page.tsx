'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatsCard } from '@/components/stats-card';
import { ScoreChart } from '@/components/score-chart';
import { DistributionChart } from '@/components/distribution-chart';
import { CategoryProgressChart } from '@/components/category-progress-chart';
import { BarChart3, TrendingUp, Users, FileText } from 'lucide-react';
import { subMonths, subYears, format } from 'date-fns';
import Link from 'next/link';

interface Stats {
  totalAudits: number;
  averageScore: number;
  timeline: Array<{ 
    month: string; 
    averageScore: number; 
    count: number;
    categories: Record<string, number>;
  }>;
  distribution: { excellent: number; good: number; average: number; poor: number };
  managers: Array<{ id: string; name: string; averageScore: number; auditCount: number }>;
  questionnaires: Array<{ id: string; name: string; type: string; averageScore: number; auditCount: number }>;
}

export default function CompanyDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Устанавливаем период за последний год, чтобы точно захватить все данные
  const [startDate, setStartDate] = useState(format(subYears(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')); // Завтра
  const [selectedManager, setSelectedManager] = useState<string>('all');
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string>('all');

  useEffect(() => {
    loadStats();
  }, [startDate, endDate, selectedManager, selectedQuestionnaire]);

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedManager !== 'all') params.append('managerId', selectedManager);
      if (selectedQuestionnaire !== 'all') params.append('questionnaireId', selectedQuestionnaire);

      console.log('Загрузка статистики с параметрами:', params.toString());
      const response = await fetch(`/api/company/stats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Получены данные:', data);
      setStats(data);
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Загрузка...</div>;
  }

  if (!stats) {
    return <div className="flex items-center justify-center h-screen">Нет данных</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Дашборд</h1>
        <p className="text-muted-foreground">Общая статистика и аналитика</p>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Настройте период и параметры для анализа</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Начало периода</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Конец периода</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="manager">Менеджер</Label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger id="manager">
                  <SelectValue placeholder="Все менеджеры" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все менеджеры</SelectItem>
                  {stats.managers && stats.managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="questionnaire">Анкета</Label>
              <Select value={selectedQuestionnaire} onValueChange={setSelectedQuestionnaire}>
                <SelectTrigger id="questionnaire">
                  <SelectValue placeholder="Все анкеты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все анкеты</SelectItem>
                  {stats.questionnaires && stats.questionnaires.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ключевые показатели */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Средний балл"
          value={`${stats.averageScore || 0}%`}
          description="За выбранный период"
          icon={TrendingUp}
        />
        <StatsCard
          title="Всего аудитов"
          value={stats.totalAudits || 0}
          description="Завершенных проверок"
          icon={FileText}
        />
        <StatsCard
          title="Менеджеров"
          value={stats.managers?.length || 0}
          description="Проверено сотрудников"
          icon={Users}
        />
        <StatsCard
          title="Отличных оценок"
          value={stats.distribution?.excellent || 0}
          description="90% и выше"
          icon={BarChart3}
        />
      </div>

      {/* Графики */}
      {stats.timeline && stats.timeline.length > 0 && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <ScoreChart
              data={stats.timeline}
              title="Динамика показателей"
              description="Изменение среднего балла по месяцам"
            />
            {stats.distribution && (
              <DistributionChart
                data={stats.distribution}
                title="Распределение оценок"
                description="Количество аудитов по диапазонам"
              />
            )}
          </div>
          
          <CategoryProgressChart data={stats.timeline} />
        </div>
      )}

      {/* Статистика по менеджерам */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Статистика по менеджерам</CardTitle>
              <CardDescription>Топ сотрудников по результатам аудитов</CardDescription>
            </div>
            <Link href="/company/managers">
              <Button variant="outline">Все менеджеры</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.managers && stats.managers.length > 0 ? (
              stats.managers
                .sort((a, b) => b.averageScore - a.averageScore)
                .slice(0, 5)
                .map((manager) => (
                  <Link key={manager.id} href={`/company/managers/${manager.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium">{manager.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {manager.auditCount} {manager.auditCount === 1 ? 'аудит' : 'аудитов'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{manager.averageScore.toFixed(1)}%</p>
                      </div>
                    </div>
                  </Link>
                ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Нет данных по менеджерам за выбранный период
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Статистика по анкетам */}
      <Card>
        <CardHeader>
          <CardTitle>Статистика по типам аудитов</CardTitle>
          <CardDescription>Результаты по различным анкетам</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.questionnaires && stats.questionnaires.length > 0 ? (
              stats.questionnaires.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{q.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {q.auditCount} {q.auditCount === 1 ? 'аудит' : 'аудитов'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{q.averageScore.toFixed(1)}%</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Нет данных по анкетам за выбранный период
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
