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

  return (
    <div className="flex h-[calc(100vh-100px)] border rounded-lg overflow-hidden bg-background shadow-sm">
      {/* Left Panel - Companies List */}
      <div className="w-1/3 min-w-[300px] max-w-[400px] border-r flex flex-col bg-muted/10">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Компании</h2>
            <div className="text-xs text-muted-foreground">{filteredCompanies.length} найдено</div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-background"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              Компании не найдены
            </div>
          ) : (
            filteredCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => setSelectedCompanyId(company.id)}
                className={`w-full text-left px-3 py-3 rounded-md transition-all flex items-center justify-between group ${
                  selectedCompanyId === company.id 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    selectedCompanyId === company.id ? 'bg-primary-foreground/20' : 'bg-muted'
                  }`}>
                    <Building2 className={`h-4 w-4 ${selectedCompanyId === company.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="truncate">
                    <div className="font-medium text-sm truncate">{company.name}</div>
                    {company.description && (
                      <div className={`text-xs truncate ${selectedCompanyId === company.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {company.description}
                      </div>
                    )}
                  </div>
                </div>
                {selectedCompanyId === company.id && <ArrowRight className="h-4 w-4 opacity-80" />}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {selectedCompanyId ? (
          <div className="flex-1 overflow-y-auto p-6">
             <div className="mb-6">
                <h2 className="text-2xl font-bold mb-1">
                  {companies.find(c => c.id === selectedCompanyId)?.name}
                </h2>
                <p className="text-muted-foreground">Выберите анкету для начала аудита</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {questionnaires.map((q) => (
                  <Card key={q.questionnaireId} className="hover:border-primary/50 transition-all cursor-pointer group hover:shadow-md" onClick={() => handleCreateAudit(q)}>
                    <CardHeader className="space-y-0 pb-2">
                       <div className="flex items-start justify-between">
                         <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                            <FileText className="h-4 w-4 text-blue-600" />
                         </div>
                       </div>
                       <CardTitle className="text-base font-medium line-clamp-2 leading-tight min-h-[2.5rem]">
                         {q.questionnaireName}
                       </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground font-medium">
                          {q.questionCount || 0} вопросов
                        </span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-primary hover:text-primary-foreground" disabled={isCreating}>
                          {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Начать"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {questionnaires.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                    <FileText className="h-8 w-8 mb-2 opacity-20" />
                    <p>Нет доступных анкет для этой компании</p>
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 opacity-40" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Компании не выбрана</h3>
            <p className="max-w-xs mt-2 text-sm">
              Выберите компанию из списка слева, чтобы увидеть доступные анкеты и начать проверку.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
