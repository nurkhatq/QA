'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format, subYears } from 'date-fns';

interface Manager {
  id: string;
  name: string;
  averageScore: number;
  auditCount: number;
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(subYears(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')); // Завтра
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3x3 сетка

  useEffect(() => {
    loadManagers();
  }, [startDate, endDate]);

  async function loadManagers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/company/stats?${params.toString()}`);
      const data = await response.json();
      setManagers(data.managers || []);
      setCurrentPage(1); // Сброс на первую страницу при загрузке новых данных
    } catch (error) {
      console.error('Failed to load managers:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredManagers = managers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.averageScore - a.averageScore);

  // Пагинация
  const totalPages = Math.ceil(filteredManagers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentManagers = filteredManagers.slice(startIndex, endIndex);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Менеджеры</h1>
        <p className="text-muted-foreground">Статистика по всем сотрудникам</p>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Поиск по имени</Label>
              <Input
                id="search"
                placeholder="Введите имя менеджера..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Сброс на первую страницу при поиске
                }}
              />
            </div>
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
          </div>
        </CardContent>
      </Card>

      {/* Информация о результатах */}
      {filteredManagers.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Показано {startIndex + 1}-{Math.min(endIndex, filteredManagers.length)} из {filteredManagers.length} менеджеров
        </div>
      )}

      {/* Список менеджеров */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currentManagers.map((manager) => (
          <Link key={manager.id} href={`/company/managers/${manager.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{manager.name}</span>
                  <Badge variant={manager.averageScore >= 70 ? 'default' : 'secondary'}>
                    {manager.averageScore >= 90 ? 'Отлично' : manager.averageScore >= 70 ? 'Хорошо' : 'Средне'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Средний балл</span>
                    </div>
                    <span className="text-2xl font-bold">{manager.averageScore.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Аудитов</span>
                    </div>
                    <span className="text-lg font-semibold">{manager.auditCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredManagers.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              {searchQuery ? 'Менеджеры не найдены' : 'Нет данных по менеджерам за выбранный период'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
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
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Вперед
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
