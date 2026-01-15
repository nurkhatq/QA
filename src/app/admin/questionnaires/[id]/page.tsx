'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Save, Plus, Edit2, GitBranch, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type Question = {
  id: string;
  text: string;
  description: string | null;
  explanation: string | null;
  category: string | null;
  weight: number;
  order: number;
  isActive: boolean;
  hasSubitems: boolean;
  subitems: Array<{
    id: string;
    text: string;
    weight: number;
    order: number;
    isActive: boolean;
  }>;
};

type MetadataField = {
  id: string;
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
  order: number;
  options: string | null;
};

type Version = {
  id: string;
  versionNumber: number;
  isActive: boolean;
  changeNotes: string | null;
  createdAt: string;
  metadataFields: MetadataField[];
  questions: Question[];
};

type QuestionnaireData = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isActive: boolean;
  scale: {
    id: string;
    name: string;
    values: Array<{
      value: number;
      label: string;
      order: number;
    }>;
  };
  versions: Version[];
};

export default function QuestionnaireDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showNewVersionDialog, setShowNewVersionDialog] = useState(false);
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);

  // Метаданные
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [editingMetadataField, setEditingMetadataField] = useState<MetadataField | null>(null);
  const [newMetadataField, setNewMetadataField] = useState({
    fieldName: '',
    fieldType: 'text',
    isRequired: false,
    order: 0,
  });

  // Категории
  const [showManageCategoriesDialog, setShowManageCategoriesDialog] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<{ oldName: string; newName: string } | null>(null);

  // Вопросы
  const [showAddQuestionDialog, setShowAddQuestionDialog] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    description: '',
    explanation: '',
    category: '',
    newCategory: '',
    weight: 1,
  });

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    try {
      const res = await fetch(`/api/admin/questionnaires/${params.id}`);
      const data = await res.json();
      setQuestionnaire(data);

      if (data.versions && data.versions.length > 0) {
        setSelectedVersion(data.versions[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNewVersion() {
    if (!newVersionNotes.trim()) {
      toast({
        title: "Ошибка",
        description: "Укажите описание изменений",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questionnaires/${params.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeNotes: newVersionNotes }),
      });

      if (res.ok) {
        toast({
          title: "Успешно",
          description: "Новая версия создана",
        });
        setShowNewVersionDialog(false);
        setNewVersionNotes('');
        loadData();
      } else {
        throw new Error('Ошибка при создании версии');
      }
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при создании версии",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateQuestion(questionId: string, updates: Partial<Question>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        toast({
          title: "Успешно",
          description: "Вопрос обновлён",
        });
        setEditingQuestion(null);
        loadData();
      } else {
        throw new Error('Ошибка при обновлении');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при обновлении",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMetadataField() {
    if (!newMetadataField.fieldName.trim() || !selectedVersion) {
      toast({
        title: "Ошибка",
        description: "Введите название поля",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let res;
      if (editingMetadataField) {
        // Update
        res = await fetch(`/api/admin/versions/${selectedVersion.id}/metadata/${editingMetadataField.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fieldName: newMetadataField.fieldName,
            fieldType: newMetadataField.fieldType,
            isRequired: newMetadataField.isRequired,
            // order не меняем пока
          }),
        });
      } else {
        // Create
        res = await fetch(`/api/admin/versions/${selectedVersion.id}/metadata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newMetadataField,
            order: selectedVersion.metadataFields?.length || 0,
          }),
        });
      }

      if (res.ok) {
        setShowMetadataDialog(false);
        setNewMetadataField({ fieldName: '', fieldType: 'text', isRequired: false, order: 0 });
        setEditingMetadataField(null);
        loadData();
        toast({
          title: "Успешно",
          description: editingMetadataField ? "Поле обновлено" : "Поле добавлено",
        });
      } else {
        throw new Error('Ошибка при сохранении поля');
      }
    } catch (error) {
      console.error('Error saving metadata field:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при сохранении поля",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function openEditMetadataDialog(field: MetadataField) {
    setEditingMetadataField(field);
    setNewMetadataField({
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        order: field.order
    });
    setShowMetadataDialog(true);
  }

  function openNewMetadataDialog() {
    setEditingMetadataField(null);
    setNewMetadataField({ fieldName: '', fieldType: 'text', isRequired: false, order: 0 });
    setShowMetadataDialog(true);
  }

  async function handleRenameCategory() {
    if (!categoryToRename || !categoryToRename.newName.trim() || !selectedVersion) return;

    if (categoryToRename.oldName === categoryToRename.newName) {
       setCategoryToRename(null);
       return;
    }

    setSaving(true);
    try {
        const res = await fetch(`/api/admin/versions/${selectedVersion.id}/categories`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                oldCategory: categoryToRename.oldName,
                newCategory: categoryToRename.newName
            }),
        });

        if (res.ok) {
            loadData();
            toast({
                title: "Успешно",
                description: "Категория переименована",
            });
            setCategoryToRename(null);
        } else {
            throw new Error('Ошибка при переименовании');
        }
    } catch (error) {
        console.error('Error renaming category:', error);
        toast({
            title: "Ошибка",
            description: "Ошибка при переименовании категории",
            variant: "destructive",
        });
    } finally {
        setSaving(false);
    }
  }

  async function handleDeleteMetadataField(fieldId: string) {
    setFieldToDelete(fieldId);
  }

  async function proceedDeleteField() {
    if (!fieldToDelete) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/versions/${selectedVersion?.id}/metadata/${fieldToDelete}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({
          title: "Успешно",
          description: "Поле удалено",
        });
        loadData();
      } else {
        throw new Error('Ошибка при удалении');
      }
    } catch (error) {
      console.error('Error deleting metadata field:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при удалении",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setFieldToDelete(null);
    }
  }

  async function handleAddQuestion() {
    if (!newQuestion.text.trim() || !selectedVersion) {
      toast({
        title: "Ошибка",
        description: "Введите текст вопроса",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/versions/${selectedVersion.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestion),
      });

      if (res.ok) {
        setShowAddQuestionDialog(false);
        setNewQuestion({
      text: '',
      description: '',
      explanation: '',
      category: '',
      newCategory: '',
      weight: 1,
    });
        loadData();
        toast({
          title: "Успешно",
          description: "Вопрос добавлен",
        });
      } else {
        throw new Error('Ошибка при добавлении вопроса');
      }
    } catch (error) {
      console.error('Error adding question:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при добавлении вопроса",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm('Деактивировать этот вопрос?')) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadData();
        toast({
          title: "Успешно",
          description: "Вопрос деактивирован",
        });
      } else {
        throw new Error('Ошибка при удалении вопроса');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при удалении вопроса",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetActiveVersion(versionId: string) {
    if (!confirm('Сделать эту версию активной? Все новые аудиты будут использовать эту версию.')) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questionnaires/${params.id}/active-version`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });

      if (res.ok) {
        toast({
          title: "Успешно",
          description: "Версия установлена как активная",
        });
        loadData();
      } else {
        throw new Error('Ошибка при установке версии');
      }
    } catch (error) {
      console.error('Error setting active version:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при установке версии",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!questionnaire) {
    return <div>Анкета не найдена</div>;
  }

  // Группируем вопросы по категориям
  const groupedQuestions = selectedVersion?.questions.reduce((acc, question) => {
    const category = question.category || 'Без категории';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(question);
    return acc;
  }, {} as Record<string, Question[]>) || {};

  const uniqueCategories = Object.keys(groupedQuestions).filter(c => c !== 'Без категории');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/questionnaires">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{questionnaire.name}</h1>
          <p className="text-muted-foreground">{questionnaire.description}</p>
        </div>
        <Badge variant="outline">{questionnaire.type}</Badge>
      </div>

      {/* Информация об анкете */}
      <Card>
        <CardHeader>
          <CardTitle>Информация об анкете</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Шкала оценок</p>
              <p className="font-medium">{questionnaire.scale.name}</p>
              <div className="flex gap-2 mt-2">
                {questionnaire.scale.values.map((v) => (
                  <Badge key={v.value} variant="outline">
                    {v.value} - {v.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Всего версий</p>
              <p className="font-medium">{questionnaire.versions.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Управление версиями */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Версии анкеты</CardTitle>
              <CardDescription>История версий и изменений</CardDescription>
            </div>
            <Dialog open={showNewVersionDialog} onOpenChange={setShowNewVersionDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <GitBranch className="mr-2 h-4 w-4" />
                  Создать новую версию
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать новую версию</DialogTitle>
                  <DialogDescription>
                    Будет создана копия текущей версии. Опишите изменения.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Описание изменений</Label>
                    <Textarea
                      value={newVersionNotes}
                      onChange={(e) => setNewVersionNotes(e.target.value)}
                      placeholder="Что изменилось в этой версии?"
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleCreateNewVersion} disabled={saving}>
                    Создать версию
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {questionnaire.versions.map((version) => (
              <div
                key={version.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                  selectedVersion?.id === version.id ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                }`}
                onClick={() => setSelectedVersion(version)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!version.isActive) {
                        handleSetActiveVersion(version.id);
                      }
                    }}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      version.isActive ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        version.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  
                  <div className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        Версия {version.versionNumber}
                      </p>
                      {version.isActive && <Badge>Активна</Badge>}
                    </div>
                    {version.changeNotes && (
                      <p className="text-sm text-muted-foreground mt-1">{version.changeNotes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(version.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{version.questions.length} вопросов</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Вопросы выбранной версии */}
      {selectedVersion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Версия {selectedVersion.versionNumber}
            </h2>
            {selectedVersion.isActive && <Badge>Активна</Badge>}
          </div>

          {/* Вводные данные версии (метаданные) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Вводные данные аудита</CardTitle>
                  <CardDescription>
                    Поля, которые аналитик заполняет перед началом аудита по этой версии
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={openNewMetadataDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Добавить поле
                    </Button>
                </div>

                <Dialog open={showMetadataDialog} onOpenChange={setShowMetadataDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingMetadataField ? 'Редактировать поле' : 'Добавить поле метаданных'}</DialogTitle>
                      <DialogDescription>
                        Настройте поле для ввода дополнительной информации об аудите
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Название поля</Label>
                        <Input
                          value={newMetadataField.fieldName}
                          onChange={(e) => setNewMetadataField({ ...newMetadataField, fieldName: e.target.value })}
                          placeholder="Например: Дата звонка"
                        />
                      </div>
                      <div>
                        <Label>Тип поля</Label>
                        <Select
                          value={newMetadataField.fieldType}
                          onValueChange={(value) => setNewMetadataField({ ...newMetadataField, fieldType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Текст</SelectItem>
                            <SelectItem value="date">Дата</SelectItem>
                            <SelectItem value="url">Ссылка (URL)</SelectItem>
                            <SelectItem value="number">Число</SelectItem>
                            <SelectItem value="textarea">Текстовая область</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={newMetadataField.isRequired}
                          onCheckedChange={(checked) => setNewMetadataField({ ...newMetadataField, isRequired: checked })}
                        />
                        <Label>Обязательное поле</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveMetadataField} disabled={saving}>
                          {editingMetadataField ? 'Сохранить' : 'Добавить'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowMetadataDialog(false)}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {selectedVersion.metadataFields && selectedVersion.metadataFields.length > 0 ? (
                <div className="space-y-2">
                  {selectedVersion.metadataFields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{field.fieldName}</p>
                          {field.isRequired && <Badge variant="destructive">Обязательное</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Тип: {field.fieldType === 'text' && 'Текст'}
                          {field.fieldType === 'date' && 'Дата'}
                          {field.fieldType === 'url' && 'Ссылка'}
                          {field.fieldType === 'number' && 'Число'}
                          {field.fieldType === 'textarea' && 'Текстовая область'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditMetadataDialog(field)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMetadataField(field.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Нет полей метаданных. Добавьте первое поле выше.
                </p>
              )}
            </CardContent>
          </Card>

      {/* Вопросы */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Вопросы</CardTitle>
                  <CardDescription>
                    {selectedVersion.questions.filter(q => q.isActive).length} активных из {selectedVersion.questions.length}
                  </CardDescription>
                </div>
                <div className="flex gap-2">


                    <Button size="sm" variant="outline" onClick={() => setShowManageCategoriesDialog(true)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Категории
                    </Button>
                    <Dialog open={showManageCategoriesDialog} onOpenChange={setShowManageCategoriesDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Управление категориями</DialogTitle>
                                <DialogDescription>
                                    Переименование категорий обновит их во всех вопросах этой версии.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 mt-4">
                                {uniqueCategories.length === 0 && <p className="text-sm text-muted-foreground">Нет категорий</p>}
                                {uniqueCategories.map(category => (
                                    <div key={category} className="flex items-center justify-between p-2 border rounded">
                                        {categoryToRename?.oldName === category ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <Input
                                                    value={categoryToRename.newName}
                                                    onChange={(e) => setCategoryToRename({ ...categoryToRename, newName: e.target.value })}
                                                    className="h-8"
                                                />
                                                <Button size="sm" onClick={handleRenameCategory} disabled={saving}>Ok</Button>
                                                <Button size="sm" variant="ghost" onClick={() => setCategoryToRename(null)}>Cancel</Button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-medium">{category}</span>
                                                <Button size="sm" variant="ghost" onClick={() => setCategoryToRename({ oldName: category, newName: category })}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={showAddQuestionDialog} onOpenChange={setShowAddQuestionDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setShowAddQuestionDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить вопрос
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Добавить новый вопрос</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>Текст вопроса</Label>
                          <Textarea
                            value={newQuestion.text}
                            onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                            placeholder="Введите текст вопроса..."
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Описание (подсказка)</Label>
                          <Textarea
                            value={newQuestion.description}
                            onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
                            placeholder="Дополнительная информация..."
                            rows={2}
                          />
                        </div>
                         <div>
                          <Label>Влияние критерия</Label>
                          <Textarea
                            value={newQuestion.explanation}
                            onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                            placeholder="Как это влияет на оценку..."
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <Label>Категория</Label>
                              <Select
                                value={newQuestion.category}
                                onValueChange={(val) => setNewQuestion({ ...newQuestion, category: val })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите категорию" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">+ Новая категория...</SelectItem>
                                  {uniqueCategories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {newQuestion.category === 'new' && (
                                <Input
                                  className="mt-2"
                                  placeholder="Название новой категории"
                                  value={newQuestion.newCategory}
                                  onChange={(e) => setNewQuestion({ ...newQuestion, newCategory: e.target.value })}
                                />
                              )}
                           </div>
                           <div>
                              <Label>Вес</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={newQuestion.weight}
                                onChange={(e) => setNewQuestion({ ...newQuestion, weight: parseFloat(e.target.value) })}
                              />
                           </div>
                        </div>
                        <Button onClick={handleAddQuestion} disabled={saving}>
                          Добавить
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(groupedQuestions).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Нет вопросов в этой версии. Добавьте первый вопрос выше.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedQuestions).map(([category, questions]) => (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle>{category}</CardTitle>
                        <CardDescription>{questions.length} вопросов</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {questions.map((question) => (
                            <div key={question.id} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline">#{question.order}</Badge>
                                    <p className="font-medium">{question.text}</p>
                                    {!question.isActive && (
                                      <Badge variant="secondary">Неактивен</Badge>
                                    )}
                                  </div>
                                  {question.description && (
                                    <p className="text-sm text-muted-foreground mb-1">
                                      {question.description}
                                    </p>
                                  )}
                                  {question.explanation && (
                                    <p className="text-sm text-muted-foreground italic">
                                      Влияние: {question.explanation}
                                    </p>
                                  )}
                                  <p className="text-sm text-muted-foreground mt-2">
                                    Вес: {question.weight}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingQuestion(question)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteQuestion(question.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                              {question.hasSubitems && question.subitems.length > 0 && (
                                <div className="ml-6 mt-3 space-y-2 border-l-2 pl-4">
                                  {question.subitems.map((subitem) => (
                                    <div key={subitem.id} className="text-sm">
                                      <div className="flex items-center justify-between">
                                        <span>{subitem.text}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">
                                            Вес: {subitem.weight}
                                          </span>
                                          {!subitem.isActive && (
                                            <Badge variant="secondary" className="text-xs">
                                              Неактивен
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

      {/* Editing Question Dialog */}
      {editingQuestion && (
        <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редактировать вопрос</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Текст вопроса</Label>
                <Textarea
                  value={editingQuestion.text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>Описание</Label>
                <Textarea
                  value={editingQuestion.description || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, description: e.target.value })}
                  rows={2}
                />
              </div>
               <div>
                <Label>Категория</Label>
                <Input
                    value={editingQuestion.category || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                />
               </div>
               <div>
                  <Label>Вес</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingQuestion.weight}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, weight: parseFloat(e.target.value) })}
                  />
               </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingQuestion.isActive}
                  onCheckedChange={(checked) => setEditingQuestion({ ...editingQuestion, isActive: checked })}
                />
                <Label>Вопрос активен</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleUpdateQuestion(editingQuestion.id, {
                    text: editingQuestion.text,
                    description: editingQuestion.description,
                    explanation: editingQuestion.explanation,
                    category: editingQuestion.category,
                    weight: editingQuestion.weight,
                    isActive: editingQuestion.isActive,
                  })}
                  disabled={saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Сохранить
                </Button>
                <Button variant="outline" onClick={() => setEditingQuestion(null)}>
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Metadata Field Dialog */}
      <Dialog open={!!fieldToDelete} onOpenChange={(open) => !open && setFieldToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить это поле?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Поле будет удалено из этой версии анкеты.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setFieldToDelete(null)} disabled={saving}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={proceedDeleteField} disabled={saving}>
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      )}
    </div>
  );
}
