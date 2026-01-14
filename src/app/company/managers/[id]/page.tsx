'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatsCard } from '@/components/stats-card';
import { ScoreChart } from '@/components/score-chart';
import { ArrowLeft, TrendingUp, FileText, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { format, subYears } from 'date-fns';

interface ManagerStats {
  manager: {
    id: string;
    name: string;
  };
  totalAudits: number;
  averageScore: number;
  timeline: Array<{ month: string; averageScore: number; count: number }>;
  questionnaires: Array<{ id: string; name: string; type: string; averageScore: number; auditCount: number }>;
}

export default function ManagerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(subYears(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')); // Завтра
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string>('all');

  useEffect(() => {
    loadStats();
  }, [params.id, startDate, endDate, selectedQuestionnaire]);

  async function loadStats() {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (selectedQuestionnaire !== 'all') queryParams.append('questionnaireId', selectedQuestionnaire);

      const response = await fetch(`/api/company/managers/${params.id}?${queryParams.toString()}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !stats) {
    return <div className="flex items-center justify-center h-screen">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/company/managers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{stats.manager.name}</h1>
          <p className="text-muted-foreground">Детальная статистика менеджера</p>
        </div>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label htmlFor="questionnaire">Анкета</Label>
              <Select value={selectedQuestionnaire} onValueChange={setSelectedQuestionnaire}>
                <SelectTrigger id="questionnaire">
                  <SelectValue placeholder="Все анкеты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все анкеты</SelectItem>
                  {stats.questionnaires.map((q) => (
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
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Средний балл"
          value={`${stats.averageScore}%`}
          description="За выбранный период"
          icon={TrendingUp}
        />
        <StatsCard
          title="Всего аудитов"
          value={stats.totalAudits}
          description="Завершенных проверок"
          icon={FileText}
        />
        <StatsCard
          title="Типов аудитов"
          value={stats.questionnaires.length}
          description="Различных анкет"
          icon={BarChart3}
        />
      </div>

      {/* График динамики */}
      {stats.timeline && stats.timeline.length > 0 && (
        <ScoreChart
          data={stats.timeline}
          title="Динамика показателей"
          description="Изменение среднего балла по месяцам"
        />
      )}

      {/* Статистика по анкетам - КЛИКАБЕЛЬНЫЕ */}
      <Card>
        <CardHeader>
          <CardTitle>Результаты по типам аудитов</CardTitle>
          <CardDescription>Кликните на анкету, чтобы посмотреть отчеты</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.questionnaires.map((q) => (
              <Link 
                key={q.id} 
                href={`/company/reports?managerId=${params.id}&questionnaireId=${q.id}&startDate=${startDate}&endDate=${endDate}`}
              >
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium">{q.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {q.auditCount} {q.auditCount === 1 ? 'аудит' : 'аудитов'} • Нажмите для просмотра
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{q.averageScore.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">средний балл</p>
                  </div>
                </div>
              </Link>
            ))}
            {stats.questionnaires.length === 0 && (
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
