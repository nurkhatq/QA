'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Spinner } from '@/components/spinner';

export default function NewAuditPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [metadataFields, setMetadataFields] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState('');
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Загружаем компании
        const companiesRes = await fetch('/api/analyst/companies');
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json();
          setCompanies(companiesData);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    }
    loadData();
  }, []);

  // Загружаем менеджеров и анкеты при выборе компании
  useEffect(() => {
    async function loadCompanyData() {
      // Сбрасываем выбранные данные при смене компании
      setSelectedManager('');
      setSelectedQuestionnaire('');
      setMetadataFields([]);
      setMetadata({});

      if (!selectedCompany) {
        setManagers([]);
        setQuestionnaires([]);
        return;
      }

      try {
        // Загружаем менеджеров
        const managersRes = await fetch(`/api/analyst/companies/${selectedCompany}/managers`);
        if (managersRes.ok) {
          const managersData = await managersRes.json();
          setManagers(managersData.filter((m: any) => m.isActive));
        }

        // Загружаем анкеты
        const questionnairesRes = await fetch(`/api/analyst/companies/${selectedCompany}/questionnaires`);
        if (questionnairesRes.ok) {
          const questionnairesData = await questionnairesRes.json();
          setQuestionnaires(questionnairesData);
        }
      } catch (error) {
        console.error('Failed to load company data:', error);
      }
    }
    loadCompanyData();
  }, [selectedCompany]);

  // Загружаем метаданные анкеты при выборе анкеты
  useEffect(() => {
    async function loadMetadataFields() {
      setMetadataFields([]);
      setMetadata({});

      if (!selectedQuestionnaire) {
        return;
      }

      setIsLoadingMetadata(true);
      try {
        const res = await fetch(`/api/analyst/questionnaires/${selectedQuestionnaire}/metadata`);
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
    loadMetadataFields();
  }, [selectedQuestionnaire]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация обязательных полей метаданных
    const missingFields = metadataFields
      .filter(field => field.isRequired && !metadata[field.id])
      .map(field => field.fieldName);

    if (missingFields.length > 0) {
      alert(`Заполните обязательные поля: ${missingFields.join(', ')}`);
      return;
    }

    setIsLoading(true);

    try {
      // Находим выбранную анкету и берем её активную версию
      const selectedQ = questionnaires.find(q => q.questionnaireId === selectedQuestionnaire);
      if (!selectedQ || !selectedQ.currentVersionId) {
        alert('Не удалось найти активную версию анкеты');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompany,
          managerId: selectedManager || null,
          versionId: selectedQ.currentVersionId,
          metadata,
        }),
      });

      if (response.ok) {
        const audit = await response.json();
        router.push(`/analyst/audits/${audit.id}`);
      } else {
        alert('Ошибка при создании аудита');
      }
    } catch (error) {
      console.error('Error creating audit:', error);
      alert('Ошибка при создании аудита');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Новый аудит</h1>
        <p className="text-muted-foreground">Создайте новый аудит для компании</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Параметры аудита</CardTitle>
          <CardDescription>
            Выберите компанию и тип аудита
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Компания</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите компанию" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager">Менеджер</Label>
              <Select
                value={selectedManager}
                onValueChange={setSelectedManager}
                disabled={!selectedCompany}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCompany ? "Выберите менеджера" : "Сначала выберите компанию"} />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questionnaire">Тип аудита</Label>
              <Select
                value={selectedQuestionnaire}
                onValueChange={setSelectedQuestionnaire}
                disabled={!selectedCompany}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCompany ? "Выберите анкету" : "Сначала выберите компанию"} />
                </SelectTrigger>
                <SelectContent>
                  {questionnaires.map((q) => (
                    <SelectItem key={q.questionnaireId} value={q.questionnaireId}>
                      {q.questionnaireName} ({q.questionnaireType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Индикатор загрузки вводных данных */}
            {isLoadingMetadata && (
              <div className="flex items-center justify-center py-8 border rounded-lg bg-muted/50">
                <div className="flex flex-col items-center gap-3">
                  <Spinner size="md" />
                  <p className="text-sm text-muted-foreground">Загрузка вводных данных...</p>
                </div>
              </div>
            )}

            {/* Вводные данные аудита (метаданные) */}
            {!isLoadingMetadata && metadataFields.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <h3 className="text-lg font-semibold">Вводные данные аудита</h3>
                  <p className="text-sm text-muted-foreground">Заполните информацию о проверяемом взаимодействии</p>
                </div>
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
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={!selectedCompany || !selectedQuestionnaire || isLoading || isLoadingMetadata}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  'Создать аудит'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                Отмена
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
