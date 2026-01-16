'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, FileText, ArrowRight, Loader2, Plus, LayoutGrid, List } from 'lucide-react';
import { getCachedCompanies, getCachedQuestionnaires, Company, Questionnaire } from '@/lib/analyst-cache';
import { createAudit } from '@/app/actions/audits'; // We'll need to update or use this
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast'; // Correct import
import { formatDateTime } from '@/lib/utils';
import { ClientDate } from '@/components/ui/client-date';

interface AnalystDashboardProps {
  initialAudits: any[]; // Replace 'any' with proper Audit type if available
}

export function AnalystDashboard({ initialAudits }: AnalystDashboardProps) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Load companies on mount
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await getCachedCompanies();
        setCompanies(data);
      } catch (error) {
        console.error('Failed to load companies:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить список компаний',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCompanies();
  }, []);

  // Load questionnaires when company selected
  useEffect(() => {
    if (!selectedCompanyId) {
      setQuestionnaires([]);
      return;
    }

    const loadQuestionnaires = async () => {
      try {
        const data = await getCachedQuestionnaires(selectedCompanyId);
        setQuestionnaires(data);
      } catch (error) {
        console.error('Failed to load questionnaires:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить анкеты',
          variant: 'destructive',
        });
      }
    };

    loadQuestionnaires();
  }, [selectedCompanyId]);

  const handleCreateAudit = async (questionnaireId: string) => {
    if (!selectedCompanyId) return;
    
    setIsCreating(true);
    try {
      // Create audit via server action
      // Note: We might need to adjust the action to accept null managerId
      // Assuming createAudit can handle this or we create a new specialized action
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          questionnaireId: questionnaireId,
          managerId: null, // Manager will be selected later
        }),
      });

      if (!response.ok) throw new Error('Failed to create audit');

      const audit = await response.json();
      router.push(`/analyst/audits/${audit.id}`);
    } catch (error) {
      console.error('Failed to create audit:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать аудит',
        variant: 'destructive',
      });
      setIsCreating(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { toast } = useToast();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-100px)]">
      {/* Sidebar - Companies */}
      <Card className="md:col-span-1 flex flex-col h-full border-r-0 rounded-r-none md:rounded-r-lg">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg">Компании</CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-sm">
                Компании не найдены
              </div>
            ) : (
              filteredCompanies.map((company) => (
                <Button
                  key={company.id}
                  variant={selectedCompanyId === company.id ? "secondary" : "ghost"}
                  className="w-full justify-start font-normal"
                  onClick={() => setSelectedCompanyId(company.id)}
                >
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{company.name}</span>
                </Button>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      <div className="md:col-span-3 space-y-6 h-full overflow-y-auto pr-2">
        {selectedCompanyId ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {companies.find(c => c.id === selectedCompanyId)?.name}
                </h2>
                <p className="text-muted-foreground">Выберите анкету для начала аудита</p>
              </div>
              <Button variant="outline" onClick={() => setSelectedCompanyId(null)}>
                Назад к списку
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questionnaires.map((q) => (
                <Card key={q.questionnaireId} className="hover:border-primary transition-colors cursor-pointer" onClick={() => handleCreateAudit(q.questionnaireId)}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">
                      {q.questionnaireName}
                    </CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-sm text-muted-foreground">
                        {q.questionCount || 0} вопросов
                      </p>
                      <Button size="sm" disabled={isCreating}>
                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                        Начать
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {questionnaires.length === 0 && (
                <div className="col-span-full text-center py-10 text-muted-foreground">
                  Нет доступных анкет для этой компании
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Мои аудиты</h2>
                <p className="text-muted-foreground">История проверок и черновики</p>
              </div>
            </div>

            {initialAudits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/10 border-dashed">
                <LayoutGrid className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Нет аудитов</h3>
                <p className="text-muted-foreground text-center max-w-sm mt-1 mb-4">
                  Выберите компанию из списка слева, чтобы создать свой первый аудит.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                  {initialAudits.map((audit) => (
                    <Card key={audit.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/analyst/audits/${audit.id}`)}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="font-semibold">{audit.company.name}</h3>
                            <p className="text-sm text-muted-foreground">{audit.version.questionnaire.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                              <span>Менеджер: {audit.manager?.name || 'Не задан'}</span>
                              <span>•</span>
                              <span><ClientDate date={audit.auditDate} /></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <Badge variant={audit.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                {audit.status === 'COMPLETED' ? 'Завершён' : 'Черновик'}
                              </Badge>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
