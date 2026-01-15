'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScoreTrendChart } from '@/components/score-trend-chart';
import { CategoryRadarChart } from '@/components/category-radar-chart';
import { QualityDistributionChart } from '@/components/quality-distribution-chart';
import { TrendingUp, FileText, Award, AlertTriangle } from 'lucide-react';
import { subYears, format } from 'date-fns';
import Link from 'next/link';

interface Stats {
  totalAudits: number;
  averageScore: number;
  previousPeriodScore: number | null;
  scoreChange: number | null;
  timeline: Array<{ 
    month: string; 
    averageScore: number; 
    count: number;
    categories: Record<string, number>;
  }>;
  distribution: { excellent: number; good: number; average: number; poor: number };
  managers: Array<{ id: string; name: string; averageScore: number; auditCount: number }>;
  questionnaires: Array<{ id: string; name: string; type: string; averageScore: number; auditCount: number }>;
  categoryAverages: Array<{ category: string; score: number }>;
}

interface Manager {
  id: string;
  name: string;
}

interface Questionnaire {
  id: string;
  name: string;
}

export default function CompanyDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [allManagers, setAllManagers] = useState<Manager[]>([]);
  const [allQuestionnaires, setAllQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(format(subYears(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'));
  const [selectedManager, setSelectedManager] = useState<string>('all');
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month');

  useEffect(() => {
    loadAllOptions();
  }, []);

  useEffect(() => {
    loadStats();
  }, [startDate, endDate, selectedManager, selectedQuestionnaire, groupBy]);

  async function loadAllOptions() {
    try {
      // Fetch all managers
      const managersRes = await fetch('/api/company/managers');
      if (managersRes.ok) {
        const managersData = await managersRes.json();
        setAllManagers(managersData);
      }

      // Fetch all questionnaires
      const questionnairesRes = await fetch('/api/company/questionnaires');
      if (questionnairesRes.ok) {
        const questionnairesData = await questionnairesRes.json();
        setAllQuestionnaires(questionnairesData);
      }
    } catch (err) {
      console.error('Ошибка загрузки опций:', err);
    }
  }

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedManager !== 'all') params.append('managerId', selectedManager);
      if (selectedQuestionnaire !== 'all') params.append('questionnaireId', selectedQuestionnaire);
      params.append('groupBy', groupBy);

      const response = await fetch(`/api/company/stats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
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

  // Find best and worst categories
  const bestCategory = stats.categoryAverages.length > 0 
    ? stats.categoryAverages.reduce((max, cat) => cat.score > max.score ? cat : max)
    : null;
  const worstCategory = stats.categoryAverages.length > 0
    ? stats.categoryAverages.reduce((min, cat) => cat.score < min.score ? cat : min)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Дашборд</h1>
        <p className="text-muted-foreground">Аналитика качества работы</p>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Настройте период и параметры для анализа</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <Label htmlFor="groupBy">Группировка</Label>
              <Select value={groupBy} onValueChange={(value: 'day' | 'week' | 'month') => setGroupBy(value)}>
                <SelectTrigger id="groupBy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">По дням</SelectItem>
                  <SelectItem value="week">По неделям</SelectItem>
                  <SelectItem value="month">По месяцам</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="manager">Менеджер</Label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger id="manager">
                  <SelectValue placeholder="Все менеджеры" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все менеджеры</SelectItem>
                  {allManagers.map((manager) => (
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
                  {allQuestionnaires.map((q) => (
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средний балл</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}%</div>
            {stats.scoreChange !== null && (
              <p className={`text-xs ${stats.scoreChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.scoreChange >= 0 ? '+' : ''}{stats.scoreChange.toFixed(1)}% от предыдущего периода
              </p>
            )}
            {stats.scoreChange === null && (
              <p className="text-xs text-muted-foreground">Нет данных для сравнения</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего аудитов</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAudits}</div>
            <p className="text-xs text-muted-foreground">
              {stats.managers.length} {stats.managers.length === 1 ? 'менеджер' : 'менеджеров'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Лучший навык</CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {bestCategory ? (
              <>
                <div className="text-2xl font-bold text-green-600">{bestCategory.score.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground truncate" title={bestCategory.category}>
                  {bestCategory.category}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Нет данных</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Требует внимания</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {worstCategory ? (
              <>
                <div className="text-2xl font-bold text-orange-600">{worstCategory.score.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground truncate" title={worstCategory.category}>
                  {worstCategory.category}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Нет данных</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      {stats.timeline && stats.timeline.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <ScoreTrendChart 
            data={stats.timeline.map(t => ({ month: t.month, averageScore: t.averageScore, count: t.count }))}
            scoreChange={stats.scoreChange}
            totalAudits={stats.totalAudits}
          />
          <QualityDistributionChart data={stats.distribution} totalAudits={stats.totalAudits} />
        </div>
      )}

      {/* Category Radar */}
      {stats.categoryAverages && stats.categoryAverages.length > 0 && (
        <CategoryRadarChart data={stats.categoryAverages} />
      )}

      {/* Manager Leaderboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Рейтинг менеджеров</CardTitle>
              <CardDescription>Топ сотрудников по результатам аудитов</CardDescription>
            </div>
            <Link href="/company/managers">
              <Button variant="outline">Все менеджеры</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.managers && stats.managers.length > 0 ? (
              stats.managers
                .sort((a, b) => b.averageScore - a.averageScore)
                .slice(0, 5)
                .map((manager, index) => (
                  <Link key={manager.id} href={`/company/managers/${manager.id}`}>
                    <div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{manager.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {manager.auditCount} {manager.auditCount === 1 ? 'аудит' : 'аудитов'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              manager.averageScore >= 90 ? 'bg-green-500' :
                              manager.averageScore >= 70 ? 'bg-blue-500' :
                              manager.averageScore >= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${manager.averageScore}%` }}
                          />
                        </div>
                        <span className="text-lg font-bold min-w-[60px] text-right">
                          {manager.averageScore.toFixed(1)}%
                        </span>
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
    </div>
  );
}
