'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Save, Database } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { getCompanyAnalysts, assignAnalystToCompany, removeAnalystFromCompany } from '@/app/actions/company-analysts';
import { getAnalysts } from '@/app/actions/users';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CompanyData = {
  id: string;
  name: string;
  description: string | null;
  connectionDate: Date;
  isActive: boolean;
  inputData: Array<{
    id: string;
    fieldName: string;
    fieldValue: string;
    isConfidential: boolean;
    questionnaireId: string | null;
    order: number;
  }>;
  managers: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>;
  questionnaires: Array<{
    id: string;
    isEnabled: boolean;
    questionnaire: {
      id: string;
      name: string;
      type: string;
    };
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
};

type QuestionnaireOption = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isEnabled: boolean;
};

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [allQuestionnaires, setAllQuestionnaires] = useState<QuestionnaireOption[]>([]);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Основная информация
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connectionDate, setConnectionDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Вводные данные
  const [inputData, setInputData] = useState<Array<{
    fieldName: string;
    fieldValue: string;
    isConfidential: boolean;
    questionnaireId?: string | null;
    order: number;
  }>>([]);

  // Менеджеры
  const [newManagerName, setNewManagerName] = useState('');

  // Аналитики
  const [assignedAnalysts, setAssignedAnalysts] = useState<any[]>([]);
  const [availableAnalysts, setAvailableAnalysts] = useState<any[]>([]);
  const [selectedAnalystId, setSelectedAnalystId] = useState('');
  const [analystToRemove, setAnalystToRemove] = useState<string | null>(null);

  // Вводные данные менеджера
  const [selectedManagerIdForData, setSelectedManagerIdForData] = useState<string | null>(null);
  const [managerInputData, setManagerInputData] = useState<Array<{
    fieldName: string;
    fieldValue: string;
    isConfidential: boolean;
    order: number;
  }>>([]);
  const [loadingManagerData, setLoadingManagerData] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    try {
      // Загружаем данные компании
      const companyRes = await fetch(`/api/admin/companies/${params.id}`);
      const companyData = await companyRes.json();
      setCompany(companyData);

      setName(companyData.name);
      setDescription(companyData.description || '');
      setConnectionDate(new Date(companyData.connectionDate).toISOString().split('T')[0]);
      setIsActive(companyData.isActive);
      setInputData(companyData.inputData);

      // Загружаем все анкеты
      const questionnairesRes = await fetch(`/api/admin/companies/${params.id}/all-questionnaires`);
      const questionnairesData = await questionnairesRes.json();
      setAllQuestionnaires(questionnairesData);

      // Загружаем аналитиков
      const [assigned, all] = await Promise.all([
        getCompanyAnalysts(params.id),
        getAnalysts()
      ]);
      setAssignedAnalysts(assigned);
      setAvailableAnalysts(all);

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBasicInfo() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          connectionDate: new Date(connectionDate),
          isActive,
        }),
      });

      if (res.ok) {
        toast({
          title: "Успешно",
          description: "Информация о компании сохранена",
        });
        loadData();
      } else {
        throw new Error('Ошибка при сохранении');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить информацию",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveInputData() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/${params.id}/input-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: inputData }),
      });

      if (res.ok) {
        toast({
          title: "Успешно",
          description: "Вводные данные сохранены",
        });
        loadData();
      } else {
        throw new Error('Ошибка при сохранении');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить вводные данные",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleQuestionnaire(questionnaireId: string) {
    try {
      const res = await fetch(`/api/admin/companies/${params.id}/questionnaires`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaireId }),
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error toggling questionnaire:', error);
    }
  }

  function addInputField() {
    setInputData([...inputData, { fieldName: '', fieldValue: '', isConfidential: false, questionnaireId: null, order: inputData.length }]);
  }

  function removeInputField(index: number) {
    setInputData(inputData.filter((_, i) => i !== index));
  }

  function updateInputField(index: number, field: string, value: any) {
    const updated = [...inputData];
    updated[index] = { ...updated[index], [field]: value };
    setInputData(updated);
  }

  async function handleAddManager() {
    if (!newManagerName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите имя менеджера",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/${params.id}/managers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newManagerName }),
      });

      if (res.ok) {
        setNewManagerName('');
        toast({
          title: "Успешно",
          description: "Менеджер добавлен",
        });
        loadData();
      } else {
        throw new Error('Ошибка при добавлении менеджера');
      }
    } catch (error) {
      console.error('Error adding manager:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить менеджера",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleManager(managerId: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/admin/companies/${params.id}/managers/${managerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        loadData();
        toast({
          title: "Успешно",
          description: `Менеджер ${isActive ? 'деактивирован' : 'активирован'}`,
        });
      } else {
        throw new Error('Ошибка при изменении статуса');
      }
    } catch (error) {
      console.error('Error toggling manager:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус менеджера",
        variant: "destructive",
      });
    }
  }

  async function handleAddAnalyst() {
     if (!selectedAnalystId) {
       toast({
         title: "Ошибка",
         description: "Выберите аналитика",
         variant: "destructive",
       });
       return;
     }
 
     setSaving(true);
     try {
       await assignAnalystToCompany(params.id, selectedAnalystId);
       setSelectedAnalystId('');
       // Перезагружаем списки
       const [assigned, all] = await Promise.all([
        getCompanyAnalysts(params.id),
        getAnalysts()
      ]);
      setAssignedAnalysts(assigned);
      setAvailableAnalysts(all);

      toast({
        title: "Успешно",
        description: "Аналитик назначен",
      });
     } catch (error) {
       console.error('Error assigning analyst:', error);
       toast({
         title: "Ошибка",
         description: "Не удалось назначить аналитика",
         variant: "destructive",
       });
     } finally {
       setSaving(false);
     }
   }
 
   async function handleRemoveAnalyst(analystId: string) {
     setAnalystToRemove(analystId);
   }

   async function proceedRemoveAnalyst() {
     if (!analystToRemove) return;

     setSaving(true);
     try {
       await removeAnalystFromCompany(params.id, analystToRemove);
       // Перезагружаем списки
       const [assigned, all] = await Promise.all([
        getCompanyAnalysts(params.id),
        getAnalysts()
      ]);
      setAssignedAnalysts(assigned);
      setAvailableAnalysts(all);

      toast({
        title: "Успешно",
        description: "Доступ у аналитика убран",
      });
     } catch (error) {
       console.error('Error removing analyst:', error);
       toast({
         title: "Ошибка",
         description: "Не удалось убрать аналитика",
         variant: "destructive",
       });
     } finally {
       setSaving(false);
       setAnalystToRemove(null);
     }
   }

    async function handleOpenManagerData(managerId: string) {
      setSelectedManagerIdForData(managerId);
      setLoadingManagerData(true);
      setManagerInputData([]);
  
      try {
        const res = await fetch(`/api/admin/managers/${managerId}/input-data`);
        if (res.ok) {
          const data = await res.json();
          setManagerInputData(data.map((item: any) => ({
            fieldName: item.fieldName,
            fieldValue: item.fieldValue,
            isConfidential: item.isConfidential,
            order: item.order
          })));
        }
      } catch (error) {
        console.error('Error loading manager input data:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить данные менеджера",
          variant: "destructive",
        });
      } finally {
        setLoadingManagerData(false);
      }
    }
  
    async function handleSaveManagerInputData() {
      if (!selectedManagerIdForData) return;
  
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/managers/${selectedManagerIdForData}/input-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: managerInputData }),
        });
  
        if (res.ok) {
          toast({
            title: "Успешно",
            description: "Вводные данные менеджера сохранены",
          });
          setSelectedManagerIdForData(null);
        } else {
          throw new Error('Ошибка при сохранении');
        }
      } catch (error) {
        console.error('Error saving manager data:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось сохранить данные",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }
  
    function addManagerInputField() {
      setManagerInputData([...managerInputData, { fieldName: '', fieldValue: '', isConfidential: false, order: managerInputData.length }]);
    }
  
    function removeManagerInputField(index: number) {
      setManagerInputData(managerInputData.filter((_, i) => i !== index));
    }
  
    function updateManagerInputField(index: number, field: string, value: any) {
      const updated = [...managerInputData];
      updated[index] = { ...updated[index], [field]: value };
      setManagerInputData(updated);
    }

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!company) {
    return <div>Компания не найдена</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/companies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{company.name}</h1>
          <p className="text-muted-foreground">Управление компанией</p>
        </div>
      </div>

      {/* Основная информация */}
      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Название компании</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="connectionDate">Дата подключения</Label>
              <Input
                id="connectionDate"
                type="date"
                value={connectionDate}
                onChange={(e) => setConnectionDate(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="isActive">Компания активна</Label>
            </div>
          </div>

          <Button onClick={handleSaveBasicInfo} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            Сохранить
          </Button>
        </CardContent>
      </Card>

      {/* Вводные данные */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Вводные данные</CardTitle>
              <CardDescription>
                Скрипты, регламенты, доступы к системам
              </CardDescription>
            </div>
            <Button onClick={addInputField} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Добавить поле
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {inputData.map((field, index) => (
            <div key={index} className="flex gap-4 items-start border p-4 rounded-lg">
              <div className="flex-1 space-y-3">
                <div>
                  <Label>Название поля</Label>
                  <Input
                    value={field.fieldName}
                    onChange={(e) => updateInputField(index, 'fieldName', e.target.value)}
                    placeholder="Например: Скрипт продаж"
                  />
                </div>
                <div>
                  <Label>Значение</Label>
                  <Textarea
                    value={field.fieldValue}
                    onChange={(e) => updateInputField(index, 'fieldValue', e.target.value)}
                    placeholder="Введите текст или данные"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Для какой анкеты</Label>
                  <Select
                    value={field.questionnaireId || 'default'}
                    onValueChange={(value) => updateInputField(index, 'questionnaireId', value === 'default' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Для всех анкет" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Для всех анкет (по умолчанию)</SelectItem>
                      {allQuestionnaires
                        .filter(q => q.isEnabled)
                        .map(q => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.name}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={field.isConfidential}
                    onCheckedChange={(checked) => updateInputField(index, 'isConfidential', checked)}
                  />
                  <Label>Конфиденциальные данные (доступны только аналитикам)</Label>
                </div>
              </div>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => removeInputField(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {inputData.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет вводных данных. Нажмите "Добавить поле" для добавления.
            </p>
          )}

          {inputData.length > 0 && (
            <Button onClick={handleSaveInputData} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Сохранить вводные данные
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Менеджеры */}
      <Card>
        <CardHeader>
          <CardTitle>Менеджеры компании</CardTitle>
          <CardDescription>
            Управление списком менеджеров для аудита
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Форма добавления менеджера */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Введите ФИО менеджера"
                value={newManagerName}
                onChange={(e) => setNewManagerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddManager()}
              />
            </div>
            <Button onClick={handleAddManager} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить
            </Button>
          </div>

          {/* Список менеджеров */}
          <div className="space-y-2">
            {company.managers?.map((manager) => (
              <div key={manager.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{manager.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenManagerData(manager.id)}
                    title="Вводные данные"
                  >
                    <Database className="h-4 w-4" />
                  </Button>
                  <Badge variant={manager.isActive ? 'default' : 'secondary'}>
                    {manager.isActive ? 'Активен' : 'Неактивен'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleManager(manager.id, manager.isActive)}
                  >
                    {manager.isActive ? 'Деактивировать' : 'Активировать'}
                  </Button>
                </div>
              </div>
            ))}
            {(!company.managers || company.managers.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет менеджеров. Добавьте первого менеджера выше.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ответственные аналитики */}
      <Card>
        <CardHeader>
          <CardTitle>Ответственные аналитики</CardTitle>
          <CardDescription>
            Управление аналитиками, которые проводят аудиты для этой компании
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={selectedAnalystId}
                onValueChange={setSelectedAnalystId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите аналитика" />
                </SelectTrigger>
                <SelectContent>
                  {availableAnalysts
                    .filter(analyst => !assignedAnalysts.find(a => a.id === analyst.id))
                    .map(analyst => (
                      <SelectItem key={analyst.id} value={analyst.id}>
                        {analyst.name} ({analyst.email})
                      </SelectItem>
                    ))
                  }
                  {availableAnalysts.length === 0 && <SelectItem value="none" disabled>Нет доступных аналитиков</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddAnalyst} disabled={saving || !selectedAnalystId}>
              <Plus className="mr-2 h-4 w-4" />
              Назначить
            </Button>
          </div>

          <div className="space-y-2">
            {assignedAnalysts.map((analyst) => (
              <div key={analyst.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{analyst.name}</p>
                  <p className="text-sm text-muted-foreground">{analyst.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemoveAnalyst(analyst.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Убрать доступ
                </Button>
              </div>
            ))}
            {assignedAnalysts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет назначенных аналитиков
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Доступные анкеты */}
      <Card>
        <CardHeader>
          <CardTitle>Доступные анкеты (тарифы)</CardTitle>
          <CardDescription>
            Управляйте доступом к анкетам для этой компании
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allQuestionnaires.map((questionnaire) => (
                <div key={questionnaire.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={questionnaire.isEnabled}
                      onCheckedChange={() => handleToggleQuestionnaire(questionnaire.id)}
                    />
                    <div>
                      <p className="font-medium">{questionnaire.name}</p>
                      <Badge variant="outline" className="mt-1">{questionnaire.type}</Badge>
                    </div>
                  </div>
                  {questionnaire.isEnabled && <Badge>Включена</Badge>}
                </div>
              ))}
            {allQuestionnaires.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет доступных анкет в системе
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Пользователи */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Пользователи компании</CardTitle>
              <CardDescription>
                Всего: {company.users?.length || 0}
              </CardDescription>
            </div>
            <Link href={`/admin/users/new?type=company&companyId=${company.id}`}>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Добавить
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {company.users?.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.isActive ? 'default' : 'secondary'}>
                    {user.isActive ? 'Активен' : 'Неактивен'}
                  </Badge>
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="outline" size="sm">
                      Редактировать
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {(!company.users || company.users.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет пользователей
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      
      <Dialog open={!!analystToRemove} onOpenChange={(open) => !open && setAnalystToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Убрать доступ?</DialogTitle>
            <DialogDescription>
              Аналитик больше не сможет проводить аудиты для этой компании.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalystToRemove(null)}>Отмена</Button>
            <Button variant="destructive" onClick={proceedRemoveAnalyst} disabled={saving}>Убрать доступ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedManagerIdForData} onOpenChange={(open) => !open && setSelectedManagerIdForData(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Вводные данные менеджера</DialogTitle>
            <DialogDescription>
              Логины, пароли, скрипты и другая информация для этого менеджера.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {loadingManagerData ? (
              <div className="text-center py-4">Загрузка...</div>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button onClick={addManagerInputField} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить поле
                  </Button>
                </div>

                <div className="space-y-4">
                  {managerInputData.map((field, index) => (
                    <div key={index} className="flex gap-4 items-start border p-4 rounded-lg">
                      <div className="flex-1 space-y-4">
                        <div>
                          <Label>Название поля</Label>
                          <Input
                            value={field.fieldName}
                            onChange={(e) => updateManagerInputField(index, 'fieldName', e.target.value)}
                            placeholder="Например: Логин в CRM"
                          />
                        </div>
                        <div>
                          <Label>Значение</Label>
                          <Textarea
                            value={field.fieldValue}
                            onChange={(e) => updateManagerInputField(index, 'fieldValue', e.target.value)}
                            placeholder="Введите значение..."
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.isConfidential}
                            onCheckedChange={(checked) => updateManagerInputField(index, 'isConfidential', checked)}
                          />
                          <Label>Конфиденциально</Label>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeManagerInputField(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {managerInputData.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Нет данных
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedManagerIdForData(null)}>Отмена</Button>
            <Button onClick={handleSaveManagerInputData} disabled={saving || loadingManagerData}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
