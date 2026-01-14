'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: string;
  text: string;
  category?: string;
  hasSubitems: boolean;
  subitems?: Array<{ id: string; text: string }>;
}

interface Audit {
  id: string;
  status: string;
  company: { 
    name: string;
    inputData: Array<{
      id: string;
      fieldName: string;
      fieldValue: string;
      isConfidential: boolean;
      questionnaireId: string | null;
    }>;
  };
  manager?: { name: string } | null;
  metadata?: Record<string, any>;
  version: {
    questionnaire: {
      id: string;
      name: string;
      scale: {
        values: Array<{ value: number; label: string }>;
      };
    };
    metadataFields: Array<{
      id: string;
      fieldName: string;
      fieldType: string;
    }>;
    questions: Question[];
  };
  answers: Array<{
    questionId?: string;
    subitemId?: string;
    score: number | null;
    comment?: string;
  }>;
  positiveComment?: string;
  negativeComment?: string;
}

export default function AuditPage() {
  const params = useParams();
  const router = useRouter();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [answers, setAnswers] = useState<Record<string, { score: number | null; comment: string }>>({});
  const [positiveComment, setPositiveComment] = useState('');
  const [negativeComment, setNegativeComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadAudit() {
      try {
        const response = await fetch(`/api/audits/${params.id}`);
        const data = await response.json();
        setAudit(data);

        // Заполняем ответы
        const answersMap: Record<string, { score: number | null; comment: string }> = {};
        data.answers.forEach((answer: any) => {
          const key = answer.subitemId || answer.questionId;
          if (key) {
            answersMap[key] = {
              score: answer.score,
              comment: answer.comment || '',
            };
          }
        });
        setAnswers(answersMap);
        setPositiveComment(data.positiveComment || '');
        setNegativeComment(data.negativeComment || '');
      } catch (error) {
        console.error('Error loading audit:', error);
      }
    }

    if (params.id) {
      loadAudit();
    }
  }, [params.id]);

  const handleScoreChange = (key: string, score: number | null) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: { ...prev[key], score },
    }));
  };

  const handleCommentChange = (key: string, comment: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: { ...prev[key], comment },
    }));
  };

  const handleSave = async () => {
    if (!audit) return;

    setIsSaving(true);
    try {
      // Сохраняем ответы
      const answersArray = Object.entries(answers).map(([key, value]) => {
        const question = audit.version.questions.find((q) => q.id === key);
        const subitem = audit.version.questions
          .flatMap((q) => q.subitems || [])
          .find((s) => s.id === key);

        return {
          questionId: question ? key : undefined,
          subitemId: subitem ? key : undefined,
          score: value.score,
          comment: value.comment,
        };
      });

      await fetch(`/api/audits/${audit.id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersArray }),
      });

      // Сохраняем комментарии
      await fetch(`/api/audits/${audit.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positiveComment,
          negativeComment,
        }),
      });

      alert('Аудит сохранён');
    } catch (error) {
      console.error('Error saving audit:', error);
      alert('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Завершить аудит? После завершения редактирование будет ограничено.')) {
      return;
    }

    await handleSave();

    try {
      await fetch(`/api/audits/${audit?.id}/complete`, {
        method: 'POST',
      });

      router.push('/analyst/audits');
    } catch (error) {
      console.error('Error completing audit:', error);
      alert('Ошибка при завершении аудита');
    }
  };

  if (!audit) {
    return <div className="flex items-center justify-center h-screen">Загрузка...</div>;
  }

  // Группируем вопросы по категориям
  const groupedQuestions = audit.version.questions.reduce((acc, question) => {
    const category = question.category || 'Без категории';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(question);
    return acc;
  }, {} as Record<string, Question[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/analyst/audits">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Аудит: {audit.company.name}</h1>
            <p className="text-muted-foreground">{audit.version.questionnaire.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={audit.status === 'COMPLETED' ? 'default' : 'secondary'}>
            {audit.status === 'COMPLETED' ? 'Завершён' : 'Черновик'}
          </Badge>
        </div>
      </div>

      {/* Информация об аудите */}
      {(audit.manager || (audit.metadata && Object.keys(audit.metadata).length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Информация об аудите</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audit.manager && (
              <div>
                <Label className="text-muted-foreground">Менеджер</Label>
                <p className="font-medium">{audit.manager.name}</p>
              </div>
            )}
            {audit.metadata && audit.version.metadataFields?.map((field) => {
              const value = audit.metadata?.[field.id];
              if (!value) return null;

              return (
                <div key={field.id}>
                  <Label className="text-muted-foreground">{field.fieldName}</Label>
                  <p className="font-medium">
                    {field.fieldType === 'url' ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Вводные данные компании */}
      {(() => {
        const relevantInputData = audit.company.inputData.filter(
          data => !data.questionnaireId || data.questionnaireId === audit.version.questionnaire.id
        );
        
        if (relevantInputData.length === 0) return null;
        
        return (
          <Card>
            <CardHeader>
              <CardTitle>Вводные данные компании</CardTitle>
              <CardDescription>
                Скрипты, регламенты и доступы для проверки
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {relevantInputData.map((data) => (
                <div key={data.id} className="space-y-2">
                  <Label className="font-semibold">{data.fieldName}</Label>
                  <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {data.fieldValue}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })()}

      <div className="space-y-6">
        {Object.entries(groupedQuestions).map(([category, questions]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((question) => (
                <div key={question.id} className="space-y-4 pb-6 border-b last:border-b-0 last:pb-0">
                  <div className="font-medium">{question.text}</div>

                  {question.hasSubitems && question.subitems ? (
                    <div className="space-y-4 pl-4">
                      {question.subitems.map((subitem) => (
                        <div key={subitem.id} className="space-y-2">
                          <Label>{subitem.text}</Label>
                          <div className="grid grid-cols-2 gap-4">
                            <Select
                              value={answers[subitem.id]?.score?.toString() || ''}
                              onValueChange={(value) =>
                                handleScoreChange(subitem.id, value ? parseFloat(value) : null)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите оценку" />
                              </SelectTrigger>
                              <SelectContent>
                                {audit.version.questionnaire.scale.values.map((scaleValue) => (
                                  <SelectItem key={scaleValue.value} value={scaleValue.value.toString()}>
                                    {scaleValue.label} ({scaleValue.value})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Textarea
                              placeholder="Комментарий (необязательно)"
                              value={answers[subitem.id]?.comment || ''}
                              onChange={(e) => handleCommentChange(subitem.id, e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        value={answers[question.id]?.score?.toString() || ''}
                        onValueChange={(value) =>
                          handleScoreChange(question.id, value ? parseFloat(value) : null)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите оценку" />
                        </SelectTrigger>
                        <SelectContent>
                          {audit.version.questionnaire.scale.values.map((scaleValue) => (
                            <SelectItem key={scaleValue.value} value={scaleValue.value.toString()}>
                              {scaleValue.label} ({scaleValue.value})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="Комментарий (необязательно)"
                        value={answers[question.id]?.comment || ''}
                        onChange={(e) => handleCommentChange(question.id, e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Итоговые комментарии</CardTitle>
            <CardDescription>
              Общая оценка и рекомендации
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="positive">Что было хорошо?</Label>
              <Textarea
                id="positive"
                placeholder="Укажите сильные стороны..."
                value={positiveComment}
                onChange={(e) => setPositiveComment(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="negative">Плохо, над чем работать?</Label>
              <Textarea
                id="negative"
                placeholder="Укажите области для улучшения..."
                value={negativeComment}
                onChange={(e) => setNegativeComment(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving || audit.status === 'COMPLETED'}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          {audit.status === 'DRAFT' && (
            <Button onClick={handleComplete} variant="default">
              <CheckCircle className="mr-2 h-4 w-4" />
              Завершить аудит
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
