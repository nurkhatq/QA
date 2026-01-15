'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SelectionCard } from '@/components/selection-card';
import { Loader2, Save, AlertCircle, RefreshCw, Building2, User, FileText, ChevronRight, ChevronLeft } from 'lucide-react';
import { Spinner } from '@/components/spinner';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

type Step = 'company' | 'manager' | 'questionnaire' | 'metadata';

export default function NewAuditPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [metadataFields, setMetadataFields] = useState<any[]>([]);
  
  // Selection
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  
  // UI State
  const [currentStep, setCurrentStep] = useState<Step>('company');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Recent selections
  const [recentCompanyIds, setRecentCompanyIds] = useState<string[]>([]);
  const [recentManagerIds, setRecentManagerIds] = useState<string[]>([]);
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
    checkForDraft();
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

  // Auto-fill date fields
  useEffect(() => {
    if (metadataFields.length > 0) {
      const newMetadata = { ...metadata };
      let hasChanges = false;
      
      const today = new Date().toISOString().split('T')[0];
      
      metadataFields.forEach(field => {
        if (field.fieldType === 'date' && !newMetadata[field.id]) {
          newMetadata[field.id] = today;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        setMetadata(newMetadata);
      }
    }
  }, [metadataFields]);

  // Auto-save draft
  const saveCurrentDraft = useCallback(() => {
    if (selectedCompany && selectedQuestionnaire) {
      saveDraft({
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        managerId: selectedManager?.id || '',
        managerName: selectedManager?.name || '',
        questionnaireId: selectedQuestionnaire.questionnaireId,
        questionnaireName: selectedQuestionnaire.questionnaireName,
        metadata,
      });
      
      setLastSaved(Date.now());
    }
  }, [selectedCompany, selectedManager, selectedQuestionnaire, metadata]);

  // Auto-save timer
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    if (selectedCompany && selectedQuestionnaire) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveCurrentDraft();
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [selectedCompany, selectedQuestionnaire, metadata, saveCurrentDraft]);

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

  async function loadMetadataFields(questionnaireId: string) {
    setMetadataFields([]);
    setMetadata({});

    setIsLoadingMetadata(true);
    try {
      const res = await fetch(`/api/analyst/questionnaires/${questionnaireId}/metadata`);
      if (res.ok) {
        const data = await res.json();
        setMetadataFields(data);
      }
    } catch (error) {
      console.error('Failed to load metadata fields:', error);
    } finally {
      setIsLoadingMetadata(false);
    }
  }

  function checkForDraft() {
    const draft = loadDraft();
    if (draft) {
      setHasDraft(true);
    }
  }

  const restoreDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      // Find company
      const company = companies.find(c => c.id === draft.companyId);
      if (company) {
        setSelectedCompany(company);
        handleCompanySelect(company);
      }
      
      setMetadata(draft.metadata);
      setHasDraft(false);
      setCurrentStep('metadata');
      
      toast({
        title: "Черновик восстановлен",
        description: "Данные успешно загружены",
      });
    }
  }, [companies, toast]);

  const dismissDraft = useCallback(() => {
    clearDraft();
    setHasDraft(false);
  }, []);

  function handleCompanySelect(company: Company) {
    setSelectedCompany(company);
    setSelectedManager(null);
    setSelectedQuestionnaire(null);
    loadManagers(company.id);
    loadQuestionnaires(company.id);
    setCurrentStep('manager');
  }

  function handleManagerSelect(manager: Manager | null) {
    setSelectedManager(manager);
    setCurrentStep('questionnaire');
  }

  function handleQuestionnaireSelect(questionnaire: Questionnaire) {
    setSelectedQuestionnaire(questionnaire);
    loadMetadataFields(questionnaire.questionnaireId);
    setCurrentStep('metadata');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompany || !selectedQuestionnaire) return;

    // Validate required metadata fields
    const missingFields = metadataFields
      .filter(field => field.isRequired && !metadata[field.id])
      .map(field => field.fieldName);

    if (missingFields.length > 0) {
      toast({
        title: "Ошибка",
        description: `Заполните обязательные поля: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          managerId: selectedManager?.id || null,
          versionId: selectedQuestionnaire.currentVersionId,
          metadata,
        }),
      });

      if (response.ok) {
        const audit = await response.json();
        
        // Save recent selection
        saveRecentSelection({
          companyId: selectedCompany.id,
          companyName: selectedCompany.name,
          managerId: selectedManager?.id,
          managerName: selectedManager?.name,
        });
        
        // Clear draft
        clearDraft();
        
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
      setIsLoading(false);
    }
  };

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
          <p className="text-muted-foreground">Создайте новый аудит для компании</p>
        </div>
        {cacheAge !== null && (
          <Button variant="outline" size="sm" onClick={handleRefreshCache}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновлено {cacheAge} мин назад
          </Button>
        )}
      </div>

      {/* Draft notification */}
      {hasDraft && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>У вас есть несохраненный черновик. Восстановить?</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={dismissDraft}>
                Отменить
              </Button>
              <Button size="sm" onClick={restoreDraft}>
                Восстановить
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`flex items-center gap-2 ${currentStep === 'company' ? 'text-primary' : selectedCompany ? 'text-green-600' : 'text-muted-foreground'}`}>
          <div className={`rounded-full p-2 ${currentStep === 'company' ? 'bg-primary text-primary-foreground' : selectedCompany ? 'bg-green-600 text-white' : 'bg-muted'}`}>
            <Building2 className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Компания</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 ${currentStep === 'manager' ? 'text-primary' : selectedManager ? 'text-green-600' : 'text-muted-foreground'}`}>
          <div className={`rounded-full p-2 ${currentStep === 'manager' ? 'bg-primary text-primary-foreground' : selectedManager ? 'bg-green-600 text-white' : 'bg-muted'}`}>
            <User className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Менеджер</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 ${currentStep === 'questionnaire' ? 'text-primary' : selectedQuestionnaire ? 'text-green-600' : 'text-muted-foreground'}`}>
          <div className={`rounded-full p-2 ${currentStep === 'questionnaire' ? 'bg-primary text-primary-foreground' : selectedQuestionnaire ? 'bg-green-600 text-white' : 'bg-muted'}`}>
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Тип аудита</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 ${currentStep === 'metadata' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`rounded-full p-2 ${currentStep === 'metadata' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Вводные данные</span>
        </div>
      </div>

      {/* Step 1: Company Selection */}
      {currentStep === 'company' && (
        <Card>
          <CardHeader>
            <CardTitle>Шаг 1: Выберите компанию</CardTitle>
            <CardDescription>
              {companies.length} {companies.length === 1 ? 'компания доступна' : 'компаний доступно'}
            </CardDescription>
          </CardHeader>
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
                    isSelected={selectedCompany?.id === company.id}
                    onSelect={() => handleCompanySelect(company)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Manager Selection */}
      {currentStep === 'manager' && selectedCompany && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Шаг 2: Выберите менеджера</CardTitle>
                <CardDescription>
                  ✓ {selectedCompany.name} • {managers.length} {managers.length === 1 ? 'менеджер доступен' : 'менеджеров доступно'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep('company')}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Назад
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Поиск менеджера..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleManagerSelect(null)}
            >
              Пропустить - без менеджера
            </Button>
            
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
                    isSelected={selectedManager?.id === manager.id}
                    onSelect={() => handleManagerSelect(manager)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Questionnaire Selection */}
      {currentStep === 'questionnaire' && selectedCompany && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Шаг 3: Выберите тип аудита</CardTitle>
                <CardDescription>
                  ✓ {selectedCompany.name} → {selectedManager ? `✓ ${selectedManager.name}` : 'Без менеджера'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep('manager')}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Назад
              </Button>
            </div>
          </CardHeader>
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
                    isSelected={selectedQuestionnaire?.questionnaireId === questionnaire.questionnaireId}
                    onSelect={() => handleQuestionnaireSelect(questionnaire)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Metadata */}
      {currentStep === 'metadata' && selectedCompany && selectedQuestionnaire && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Вводные данные аудита</CardTitle>
                <CardDescription>
                  ✓ {selectedCompany.name} → {selectedManager ? `✓ ${selectedManager.name}` : 'Без менеджера'} → ✓ {selectedQuestionnaire.questionnaireName}
                  {lastSaved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 mt-1">
                      <Save className="h-3 w-3" />
                      Черновик сохранен {new Date(lastSaved).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep('questionnaire')}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Назад
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingMetadata ? (
              <div className="flex items-center justify-center py-8 border rounded-lg bg-muted/50">
                <div className="flex flex-col items-center gap-3">
                  <Spinner size="md" />
                  <p className="text-sm text-muted-foreground">Загрузка вводных данных...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {metadataFields.length > 0 ? (
                  <div className="space-y-3">
                    {metadataFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                          {field.fieldName}
                          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {field.fieldType === 'text' && (
                          <Input
                            id={field.id}
                            value={metadata[field.id] || ''}
                            onChange={(e) => setMetadata({ ...metadata, [field.id]: e.target.value })}
                            placeholder={`Введите ${field.fieldName.toLowerCase()}`}
                          />
                        )}
                        {field.fieldType === 'date' && (
                          <Input
                            id={field.id}
                            type="date"
                            value={metadata[field.id] || ''}
                            onChange={(e) => setMetadata({ ...metadata, [field.id]: e.target.value })}
                          />
                        )}
                        {field.fieldType === 'url' && (
                          <Input
                            id={field.id}
                            type="url"
                            value={metadata[field.id] || ''}
                            onChange={(e) => setMetadata({ ...metadata, [field.id]: e.target.value })}
                            placeholder="https://..."
                          />
                        )}
                        {field.fieldType === 'number' && (
                          <Input
                            id={field.id}
                            type="number"
                            value={metadata[field.id] || ''}
                            onChange={(e) => setMetadata({ ...metadata, [field.id]: e.target.value })}
                            placeholder="0"
                          />
                        )}
                        {field.fieldType === 'textarea' && (
                          <Textarea
                            id={field.id}
                            value={metadata[field.id] || ''}
                            onChange={(e) => setMetadata({ ...metadata, [field.id]: e.target.value })}
                            placeholder={`Введите ${field.fieldName.toLowerCase()}`}
                            rows={3}
                          />
                        )}
                        {field.fieldType === 'radio' && field.options && (
                          <RadioGroup
                             value={metadata[field.id] || ''}
                             onValueChange={(value) => setMetadata({ ...metadata, [field.id]: value })}
                             className="flex flex-col space-y-2"
                          >
                            {field.options.split(';').map((option: string) => (
                              <div key={option} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Нет дополнительных полей для заполнения</p>
                )}

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      'Создать аудит'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
