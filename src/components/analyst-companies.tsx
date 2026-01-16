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

  const handleCreateAudit = async (questionnaire: Questionnaire) => {
    if (!selectedCompanyId) return;
    
    setIsCreating(true);
    try {
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          versionId: questionnaire.currentVersionId, // Use currentVersionId from cached object
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

  const toggleCompany = (companyId: string) => {
    if (selectedCompanyId === companyId) {
      setSelectedCompanyId(null);
    } else {
      setSelectedCompanyId(companyId);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Компании</h1>
          <p className="text-muted-foreground">Выберите компанию для проведения аудита</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск компании..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center p-8 border rounded-lg bg-muted/50 text-muted-foreground">
            Компании не найдены
          </div>
        ) : (
          filteredCompanies.map((company) => (
            <Card key={company.id} className={`transition-all ${selectedCompanyId === company.id ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}>
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg"
                onClick={() => toggleCompany(company.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">{company.name}</h3>
                    {company.description && (
                      <p className="text-sm text-muted-foreground">{company.description}</p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <ArrowRight className={`h-5 w-5 transition-transform ${selectedCompanyId === company.id ? 'rotate-90' : ''}`} />
                </Button>
              </div>
              
              {selectedCompanyId === company.id && (
                <div className="p-4 border-t bg-muted/30">
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wider">Доступные анкеты</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {questionnaires.length > 0 ? (
                      questionnaires.map((q) => (
                        <div key={q.questionnaireId} className="bg-background border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCreateAudit(q)}>
                          <div className="flex items-start justify-between mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                            {isCreating ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                                <Plus className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <h5 className="font-medium text-sm line-clamp-2" title={q.questionnaireName}>
                            {q.questionnaireName}
                          </h5>
                          <div className="text-xs text-muted-foreground mt-1">
                             {q.questionCount || 0} вопросов
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
                        Загрузка анкет или список пуст...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
