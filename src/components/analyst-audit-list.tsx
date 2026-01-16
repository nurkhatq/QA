'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ClientDate } from '@/components/ui/client-date';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: 'Черновик', variant: 'secondary' },
  COMPLETED: { label: 'Завершён', variant: 'default' },
};

interface Audit {
  id: string;
  status: string;
  auditDate: Date;
  company: { name: string };
  manager?: { name: string } | null;
  version: { questionnaire: { name: string } };
}

interface Props {
  initialAudits: any[]; // Using any[] to match server action return type flexibility, or define stricter
}

export function AnalystAuditList({ initialAudits }: Props) {
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterManager, setFilterManager] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique options
  const companies = Array.from(new Set(initialAudits.map(a => a.company.name))).sort();
  const managers = Array.from(new Set(initialAudits.map(a => a.manager?.name).filter(Boolean))).sort() as string[];

  const filteredAudits = initialAudits.filter(audit => {
    const matchesCompany = filterCompany === 'all' || audit.company.name === filterCompany;
    const matchesManager = filterManager === 'all' || (audit.manager?.name || '—') === filterManager;
    const matchesSearch = 
      (audit.company.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (audit.manager?.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (audit.version.questionnaire.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCompany && matchesManager && matchesSearch;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Все аудиты</CardTitle>
        <CardDescription>
          Всего аудитов: {initialAudits.length} (Найдено: {filteredAudits.length})
        </CardDescription>
        
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <Input 
            placeholder="Поиск..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="md:w-64"
          />
          
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="Компания" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все компании</SelectItem>
              {companies.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterManager} onValueChange={setFilterManager}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="Менеджер" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все менеджеры</SelectItem>
              <SelectItem value="—">Без менеджера</SelectItem>
              {managers.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {(filterCompany !== 'all' || filterManager !== 'all' || searchQuery) && (
             <Button variant="ghost" onClick={() => {
               setFilterCompany('all');
               setFilterManager('all');
               setSearchQuery('');
             }}>
               Сбросить
             </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
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
              {filteredAudits.map((audit) => (
                <TableRow key={audit.id}>
                  <TableCell className="font-medium">{audit.company.name}</TableCell>
                  <TableCell>{audit.manager?.name || '—'}</TableCell>
                  <TableCell>{audit.version.questionnaire.name}</TableCell>
                  <TableCell>
                    <ClientDate date={audit.auditDate} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusLabels[audit.status as string]?.variant || 'outline'}>
                      {statusLabels[audit.status as string]?.label || audit.status}
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
              {filteredAudits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Ничего не найдено
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
