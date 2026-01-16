'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Plus, ArrowLeft } from 'lucide-react';
import { getCachedCompanies, getCachedQuestionnaires, Company, Questionnaire } from '@/lib/analyst-cache';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface Props {
  companyId: string;
}

export function CompanyQuestionnaires({ companyId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch company details (from cache list)
        const companies = await getCachedCompanies();
        const found = companies.find((c) => c.id === companyId);
        setCompany(found || null);

        // Fetch questionnaires
        const qList = await getCachedQuestionnaires(companyId);
        setQuestionnaires(qList);
      } catch (error) {
         console.error('Failed to load data:', error);
         toast({
           title: 'Ошибка',
           description: 'Не удалось загрузить данные компании',
           variant: 'destructive',
         });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [companyId]);

  const handleCreateAudit = async (questionnaire: Questionnaire) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: companyId,
          versionId: questionnaire.currentVersionId,
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Компания не найдена
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{company.name}</h1>
          <p className="text-muted-foreground mt-1 text-lg">
             {company.description || 'Выберите анкету для начала аудита'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {questionnaires.map((q) => (
          <Card key={q.questionnaireId} className="hover:border-primary/50 transition-all cursor-pointer group hover:shadow-lg hover:-translate-y-1 duration-200" onClick={() => handleCreateAudit(q)}>
            <CardHeader className="space-y-0 pb-4">
               <div className="flex items-start justify-between">
                 <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                    <FileText className="h-5 w-5 text-blue-600" />
                 </div>
                 {isCreating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
               </div>
               <CardTitle className="text-lg font-semibold line-clamp-2 leading-tight min-h-[3.5rem]">
                 {q.questionnaireName}
               </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mt-2 pt-4 border-t border-border/50">
                <span className="text-sm text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded">
                  {q.questionCount || 0} вопросов
                </span>
                <span className="text-primary font-medium text-sm flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                   Начать <Plus className="ml-1 h-4 w-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {questionnaires.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/5 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-1">Нет анкет</h3>
            <p>Для этой компании пока не создано ни одной анкеты</p>
          </div>
        )}
      </div>
    </div>
  );
}
