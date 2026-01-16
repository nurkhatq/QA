'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Building2, FileText, ArrowRight, Loader2, Plus } from 'lucide-react';
import { getCachedCompanies, getCachedQuestionnaires, Company, Questionnaire } from '@/lib/analyst-cache';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function AnalystCompanies() {
  const router = useRouter();
  const { toast } = useToast();
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
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          questionnaireId: questionnaireId,
          // managerId is intentionally omitted or null, as it will be selected later
          managerId: null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create audit');
      }

      const audit = await response.json();
      router.push(`/analyst/audits/${audit.id}`);
    } catch (error: any) {
      console.error('Failed to create audit:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать аудит',
        variant: 'destructive',
      });
      setIsCreating(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-100px)]">
      {/* Sidebar - Companies Listing */}
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

      {/* Main Content Area - Questionnaires */}
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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Building2 className="h-16 w-16 mb-4 opacity-20" />
            <h3 className="text-lg font-medium">Выберите компанию</h3>
            <p className="text-center max-w-sm mt-1">
              Выберите компанию из списка слева, чтобы увидеть доступные анкеты и начать аудит.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
