'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import Link from 'next/link';

type ScaleOption = {
  id: string;
  name: string;
  values: Array<{
    value: number;
    label: string;
  }>;
};

type Subitem = {
  text: string;
  weight: number;
  order: number;
};

type Question = {
  text: string;
  description: string;
  explanation: string;
  category: string;
  weight: number;
  order: number;
  hasSubitems: boolean;
  subitems: Subitem[];
};

export default function NewQuestionnairePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scales, setScales] = useState<ScaleOption[]>([]);

  // Основная информация
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [scaleId, setScaleId] = useState('');

  // Вопросы
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadScales();
  }, []);

  async function loadScales() {
    try {
      const res = await fetch('/api/admin/scales');
      const data = await res.json();
      setScales(data);
      if (data.length > 0) {
        setScaleId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load scales:', error);
    } finally {
      setLoading(false);
    }
  }

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        text: '',
        description: '',
        explanation: '',
        category: '',
        weight: 1.0,
        order: questions.length,
        hasSubitems: false,
        subitems: [],
      },
    ]);
    setExpandedQuestions(new Set([...expandedQuestions, questions.length]));
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
    const newExpanded = new Set(expandedQuestions);
    newExpanded.delete(index);
    setExpandedQuestions(newExpanded);
  }

  function updateQuestion(index: number, field: keyof Question, value: any) {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  }

  function addSubitem(questionIndex: number) {
    const updated = [...questions];
    updated[questionIndex].subitems.push({
      text: '',
      weight: 1.0,
      order: updated[questionIndex].subitems.length,
    });
    updated[questionIndex].hasSubitems = true;
    setQuestions(updated);
  }

  function removeSubitem(questionIndex: number, subitemIndex: number) {
    const updated = [...questions];
    updated[questionIndex].subitems = updated[questionIndex].subitems.filter((_, i) => i !== subitemIndex);
    if (updated[questionIndex].subitems.length === 0) {
      updated[questionIndex].hasSubitems = false;
    }
    setQuestions(updated);
  }

  function updateSubitem(questionIndex: number, subitemIndex: number, field: keyof Subitem, value: any) {
    const updated = [...questions];
    updated[questionIndex].subitems[subitemIndex] = {
      ...updated[questionIndex].subitems[subitemIndex],
      [field]: value,
    };
    setQuestions(updated);
  }

  function toggleExpanded(index: number) {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  }

  async function handleSave() {
    if (!name.trim() || !type.trim() || !scaleId) {
      alert('Заполните обязательные поля: название, тип и шкалу оценок');
      return;
    }

    if (questions.length === 0) {
      alert('Добавьте хотя бы один вопрос');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/questionnaires/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          type,
          scaleId,
          questions,
        }),
      });

      if (res.ok) {
        alert('Анкета создана');
        router.push('/admin/questionnaires');
      } else {
        const error = await res.json();
        alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/questionnaires">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Создать анкету</h1>
          <p className="text-muted-foreground">Заполните информацию и добавьте вопросы</p>
        </div>
      </div>

      {/* Основная информация */}
      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Название анкеты *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Аудит звонков отдела продаж"
            />
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание анкеты"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="type">Тип анкеты *</Label>
            <Input
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Например: Звонки, Переписки, CRM"
            />
          </div>

          <div>
            <Label htmlFor="scale">Шкала оценок *</Label>
            <Select value={scaleId} onValueChange={setScaleId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scales.map((scale) => (
                  <SelectItem key={scale.id} value={scale.id}>
                    {scale.name} ({scale.values.map((v) => v.value).join(' / ')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Вопросы */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Вопросы</CardTitle>
              <CardDescription>Добавьте критерии оценки</CardDescription>
            </div>
            <Button onClick={addQuestion} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Добавить вопрос
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question, qIndex) => {
            const isExpanded = expandedQuestions.has(qIndex);

            return (
              <div key={qIndex} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <span className="text-sm font-medium text-muted-foreground">#{qIndex + 1}</span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={question.text}
                        onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                        placeholder="Текст вопроса *"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(qIndex)}
                      >
                        {isExpanded ? 'Свернуть' : 'Развернуть'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeQuestion(qIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {isExpanded && (
                      <>
                        <div>
                          <Label>Описание</Label>
                          <Textarea
                            value={question.description}
                            onChange={(e) => updateQuestion(qIndex, 'description', e.target.value)}
                            placeholder="Описание назначения вопроса"
                            rows={2}
                          />
                        </div>

                        <div>
                          <Label>Влияние критерия</Label>
                          <Textarea
                            value={question.explanation}
                            onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                            placeholder="На что влияет этот критерий"
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Категория</Label>
                            <Input
                              value={question.category}
                              onChange={(e) => updateQuestion(qIndex, 'category', e.target.value)}
                              placeholder="Например: Установление контакта"
                            />
                          </div>
                          <div>
                            <Label>Вес</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={question.weight}
                              onChange={(e) => updateQuestion(qIndex, 'weight', parseFloat(e.target.value))}
                            />
                          </div>
                        </div>

                        {/* Подпункты */}
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <Label>Подпункты</Label>
                            <Button
                              onClick={() => addSubitem(qIndex)}
                              size="sm"
                              variant="outline"
                            >
                              <Plus className="mr-2 h-3 w-3" />
                              Добавить подпункт
                            </Button>
                          </div>

                          {question.subitems.map((subitem, sIndex) => (
                            <div key={sIndex} className="flex gap-2 mb-2 ml-6">
                              <Input
                                value={subitem.text}
                                onChange={(e) => updateSubitem(qIndex, sIndex, 'text', e.target.value)}
                                placeholder="Текст подпункта"
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                step="0.1"
                                value={subitem.weight}
                                onChange={(e) => updateSubitem(qIndex, sIndex, 'weight', parseFloat(e.target.value))}
                                placeholder="Вес"
                                className="w-24"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSubitem(qIndex, sIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {questions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Нет вопросов. Нажмите "Добавить вопрос" для начала.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Кнопки действий */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          Создать анкету
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
