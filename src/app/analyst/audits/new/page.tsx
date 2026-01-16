'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectionCard } from '@/components/selection-card';
import { Loader2, Save, RefreshCw, Building2, User, FileText, Check } from 'lucide-react';
import { Spinner } from '@/components/spinner';
import { useToast } from '@/hooks/use-toast';
import {
  saveDraft,
  loadDraft,
  clearDraft,
  saveRecentSelection,
  getRecentCompanyIds,
  getRecentManagerIds,
} from '@/lib/draft-manager';
import {
  getCachedCompanies,
  getCachedManagers,
  getCachedQuestionnaires,
  invalidateCache,
  getCacheAge,
  type Company,
  type Manager,
  type Questionnaire,
} from '@/lib/analyst-cache';

export default function NewAuditPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  
  // Selection
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Recent selections
  const [recentCompanyIds, setRecentCompanyIds] = useState<string[]>([]);
  const [recentManagerIds, setRecentManagerIds] = useState<string[]>([]);

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
    setRecentCompanyIds(getRecentCompanyIds());
  }, []);

  // Update cache age
  useEffect(() => {
    const age = getCacheAge();
    setCacheAge(age);
  }, [companies]);

  // Update recent manager IDs when company changes
  useEffect(() => {
    if (selectedCompany) {
      setRecentManagerIds(getRecentManagerIds(selectedCompany.id));
    }
  }, [selectedCompany]);

  async function loadCompanies() {
    try {
      setIsLoading(true);
      const data = await getCachedCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Failed to load companies:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список компаний",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadManagers(companyId: string) {
    try {
      setIsLoading(true);
      const data = await getCachedManagers(companyId);
      setManagers(data.filter(m => m.isActive));
    } catch (error) {
      console.error('Failed to load managers:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список менеджеров",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadQuestionnaires(companyId: string) {
    try {
      setIsLoading(true);
      const data = await getCachedQuestionnaires(companyId);
      setQuestionnaires(data);
    } catch (error) {
      console.error('Failed to load questionnaires:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список анкет",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleCompanySelect(company: Company) {
    setSelectedCompany(company);
    setSelectedManager(null);
    setSelectedQuestionnaire(null);
    loadManagers(company.id);
    loadQuestionnaires(company.id);
    setSearchQuery('');
  }

  function handleManagerSelect(manager: Manager) {
    setSelectedManager(manager);
    setSearchQuery('');
  }

  function handleQuestionnaireSelect(questionnaire: Questionnaire) {
    setSelectedQuestionnaire(questionnaire);
  }

  function handleRefreshCache() {
    invalidateCache();
    loadCompanies();
    if (selectedCompany) {
      loadManagers(selectedCompany.id);
      loadQuestionnaires(selectedCompany.id);
    }
    toast({
      title: "Обновлено",
      description: "Данные обновлены с сервера",
    });
  }

  async function handleCreate() {
    if (!selectedCompany || !selectedManager || !selectedQuestionnaire) return;

    setIsCreating(true);

    try {
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          managerId: selectedManager.id,
          versionId: selectedQuestionnaire.currentVersionId,
          metadata: {}, // Metadata will be filled during evaluation
        }),
      });

      if (response.ok) {
        const audit = await response.json();
        
        // Save recent selection
        saveRecentSelection({
          companyId: selectedCompany.id,
          companyName: selectedCompany.name,
          managerId: selectedManager.id,
          managerName: selectedManager.name,
        });
        
        toast({
          title: "Успешно",
          description: "Аудит создан",
        });
        router.push(`/analyst/audits/${audit.id}`);
      } else {
        throw new Error('Ошибка при создании аудита');
      }
    } catch (error) {
      console.error('Error creating audit:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при создании аудита",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }

  // Filter items by search query
  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredManagers = managers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredQuestionnaires = questionnaires.filter(q =>
    q.questionnaireName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.questionnaireType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Новый аудит</h1>
          <p className="text-muted-foreground">Выберите компанию, менеджера и тип аудита</p>
        </div>
        {cacheAge !== null && (
          <Button variant="outline" size="sm" onClick={handleRefreshCache}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновлено {cacheAge} мин назад
          </Button>
        )}
      </div>

      {/* Company Selection */}
      <Card className={selectedCompany ? 'border-green-500' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedCompany ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
              <CardTitle>
                {selectedCompany ? `✓ ${selectedCompany.name}` : 'Выберите компанию'}
              </CardTitle>
            </div>
            {selectedCompany && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCompany(null);
                  setSelectedManager(null);
                  setSelectedQuestionnaire(null);
                  setSearchQuery('');
                }}
              >
                Изменить
              </Button>
            )}
          </div>
          {!selectedCompany && (
            <CardDescription>
              {companies.length} {companies.length === 1 ? 'компания доступна' : 'компаний доступно'}
            </CardDescription>
          )}
        </CardHeader>
        {!selectedCompany && (
          <CardContent className="space-y-4">
            <Input
              placeholder="Поиск компании..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCompanies.map((company) => (
                  <SelectionCard
                    key={company.id}
                    icon={<Building2 />}
                    title={company.name}
                    subtitle={company.description}
                    stats={company.auditCount ? `${company.auditCount} аудитов` : undefined}
                    isRecent={recentCompanyIds.includes(company.id)}
                    isSelected={false}
                    onSelect={() => handleCompanySelect(company)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Manager Selection */}
      {selectedCompany && (
        <Card className={selectedManager ? 'border-green-500' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedManager ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <User className="h-5 w-5" />
                )}
                <CardTitle>
                  {selectedManager ? `✓ ${selectedManager.name}` : 'Выберите менеджера'}
                </CardTitle>
              </div>
              {selectedManager && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedManager(null);
                    setSelectedQuestionnaire(null);
                    setSearchQuery('');
                  }}
                >
                  Изменить
                </Button>
              )}
            </div>
            {!selectedManager && (
              <CardDescription>
                {managers.length} {managers.length === 1 ? 'менеджер доступен' : 'менеджеров доступно'}
              </CardDescription>
            )}
          </CardHeader>
          {!selectedManager && (
            <CardContent className="space-y-4">
              <Input
                placeholder="Поиск менеджера..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredManagers.map((manager) => (
                    <SelectionCard
                      key={manager.id}
                      icon={<User />}
                      title={manager.name}
                      stats={manager.lastAuditDate ? `Последний аудит: ${new Date(manager.lastAuditDate).toLocaleDateString('ru-RU')}` : 'Нет аудитов'}
                      isRecent={recentManagerIds.includes(manager.id)}
                      isSelected={false}
                      onSelect={() => handleManagerSelect(manager)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Questionnaire Selection */}
      {selectedCompany && selectedManager && (
        <Card className={selectedQuestionnaire ? 'border-green-500' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedQuestionnaire ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
                <CardTitle>
                  {selectedQuestionnaire ? `✓ ${selectedQuestionnaire.questionnaireName}` : 'Выберите тип аудита'}
                </CardTitle>
              </div>
              {selectedQuestionnaire && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedQuestionnaire(null);
                    setSearchQuery('');
                  }}
                >
                  Изменить
                </Button>
              )}
            </div>
            {!selectedQuestionnaire && (
              <CardDescription>
                {questionnaires.length} {questionnaires.length === 1 ? 'анкета доступна' : 'анкет доступно'}
              </CardDescription>
            )}
          </CardHeader>
          {!selectedQuestionnaire && (
            <CardContent className="space-y-4">
              <Input
                placeholder="Поиск анкеты..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredQuestionnaires.map((questionnaire) => (
                    <SelectionCard
                      key={questionnaire.questionnaireId}
                      icon={<FileText />}
                      title={questionnaire.questionnaireName}
                      subtitle={questionnaire.questionnaireType}
                      stats={questionnaire.questionCount ? `${questionnaire.questionCount} вопросов` : undefined}
                      isSelected={false}
                      onSelect={() => handleQuestionnaireSelect(questionnaire)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Create Button */}
      {selectedCompany && selectedManager && selectedQuestionnaire && (
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleCreate}
            disabled={isCreating}
            className="min-w-[200px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Создание...
              </>
            ) : (
              'Создать аудит'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
