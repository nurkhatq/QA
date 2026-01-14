'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format, subMonths } from 'date-fns';

interface Audit {
  id: string;
  totalScore: number;
  auditDate: string;
  completedAt: string;
  manager: {
    id: string;
    name: string;
  } | null;
  version: {
    questionnaire: {
      id: string;
      name: string;
      type: string;
    };
  };
}

interface AuditsResponse {
  audits: Audit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AuditsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Получаем параметры из URL или используем дефолтные
  const [startDate, setStartDate] = useState(
    searchParams.get('startDate') || format(subMonths(new Date(), 3), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    searchParams.get('endDate') || format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
  );
  const [selectedManager, setSelectedManager] = useState<string>(
    searchParams.get('managerId') || 'all'
  );
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string>(
    searchParams.get('questionnaireId') || 'all'
  );
  const [page, setPage] = useState(1);
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([]);
  const [questionnaires, setQuestionnaires] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadAudits();
  }, [startDate, endDate, selectedManager, selectedQuestionnaire, page]);

  async function loadFilters() {
    try {
      const response = await fetch('/api/company/stats');
      const stats = await response.json();
      setManagers(stats.managers || []);
      setQuestionnaires(stats.questionnaires || []);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  }

  async function loadAudits() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedManager !== 'all') params.append('managerId', selectedManager);
      if (selectedQuestionnaire !== 'all') params.append('questionnaireId', selectedQuestionnaire);
      params.append('page', page.toString());
      params.append('pageSize', '10'); // Уменьшил до 10 для лучшей пагинации

      const response = await fetch(`/api/company/audits?${params.toString()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to load audits:', error);
    } finally {
      setLoading(false);
    }
  }

  function getScoreBadgeVariant(score: number) {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  }

  function getScoreLabel(score: number) {
    if (score >= 90) return 'Отлично';
    if (score >= 70) return 'Хорошо';
    if (score >= 50) return 'Средне';
    return 'Плохо';
  }

  if (loading && !data) {
    return <div className="flex items-center justify-center h-screen">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Отчеты</h1>
        <p className="text-muted-foreground">Все аудиты и детальные отчеты</p>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Настройте параметры для поиска отчетов</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Начало периода</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1); // Сброс на первую страницу при изменении фильтра
                }}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Конец периода</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <Label htmlFor="manager">Менеджер</Label>
              <Select value={selectedManager} onValueChange={(value) => {
                setSelectedManager(value);
                setPage(1);
              }}>
                <SelectTrigger id="manager">
                  <SelectValue placeholder="Все менеджеры" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все менеджеры</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="questionnaire">Анкета</Label>
              <Select value={selectedQuestionnaire} onValueChange={(value) => {
                setSelectedQuestionnaire(value);
                setPage(1);
              }}>
                <SelectTrigger id="questionnaire">
                  <SelectValue placeholder="Все анкеты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все анкеты</SelectItem>
                  {questionnaires.map((q) => (
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

      {/* Список аудитов */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Найдено аудитов: {data?.total || 0}</CardTitle>
              <CardDescription>
                Страница {data?.page || 1} из {data?.totalPages || 1}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.audits.map((audit) => (
              <Link key={audit.id} href={`/company/reports/${audit.id}`}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{audit.version.questionnaire.name}</p>
                      <Badge variant="outline">{audit.version.questionnaire.type}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {audit.manager && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{audit.manager.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(audit.auditDate), 'dd.MM.yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{audit.totalScore?.toFixed(1) || 0}%</p>
                      <p className="text-xs text-muted-foreground">итоговый балл</p>
                    </div>
                    <Badge variant={getScoreBadgeVariant(audit.totalScore || 0)}>
                      {getScoreLabel(audit.totalScore || 0)}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
            {data?.audits.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                Нет аудитов за выбранный период
              </p>
            )}
          </div>

          {/* Пагинация */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Показано {((data.page - 1) * data.pageSize) + 1}-{Math.min(data.page * data.pageSize, data.total)} из {data.total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Назад
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                    let pageNum;
                    if (data.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= data.totalPages - 2) {
                      pageNum = data.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages || loading}
                >
                  Вперед
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
