'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { FullPageSpinner } from '@/components/spinner';
import { FullPageError } from '@/components/error-card';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Question {
  id: string;
  text: string;
  description?: string | null;
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
  const { toast } = useToast();
  
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [answers, setAnswers] = useState<Record<string, { score: number | null; comment: string }>>({});
  const [positiveComment, setPositiveComment] = useState('');
  const [negativeComment, setNegativeComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

  useEffect(() => {
    loadAudit();
  }, [params.id]);

  async function loadAudit() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/audits/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить аудит');
      }
      
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
    } catch (err) {
      console.error('Error loading audit:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке');
    } finally {
      setLoading(false);
    }
  }

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

      const answersResponse = await fetch(`/api/audits/${audit.id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersArray }),
      });

      if (!answersResponse.ok) {
        throw new Error('Не удалось сохранить ответы');
      }

      // Сохраняем комментарии
      const commentsResponse = await fetch(`/api/audits/${audit.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positiveComment,
          negativeComment,
        }),
      });

      if (!commentsResponse.ok) {
        throw new Error('Не удалось сохранить комментарии');
      }

      toast({
        title: 'Успешно сохранено',
        description: 'Аудит успешно сохранён',
      });
    } catch (err) {
      console.error('Error saving audit:', err);
      toast({
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Не удалось сохранить аудит',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleteDialogOpen(false); // Close dialog immediately or keep open? Usually close before async or keep loading.
    // Let's keep it open or close it? The logic uses `isCompleting` loading state.
    // If we close it, `isCompleting` will show on the main button? No, let's close it after success or keep it open with loader?
    // Common pattern: Close dialog, then show generic loader or toast.
    // But `handleComplete` sets `setIsCompleting(true)`.
    setIsCompleteDialogOpen(false);
    setIsCompleting(true);
    
    try {
      // Сначала сохраняем
      await handleSave();

      // Затем завершаем
      const response = await fetch(`/api/audits/${audit?.id}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Не удалось завершить аудит');
      }

      toast({
        title: 'Аудит завершён',
        description: 'Аудит успешно завершён и отправлен компании',
      });

      router.push('/analyst/audits');
    } catch (err) {
      console.error('Error completing audit:', err);
      toast({
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Не удалось завершить аудит',
        variant: 'destructive',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Состояние загрузки
  if (loading) {
    return <FullPageSpinner text="Загрузка аудита и вводных данных..." />;
  }

  // Состояние ошибки
  if (error || !audit) {
    return (
      <FullPageError 
        title="Ошибка загрузки аудита"
        message={error || 'Аудит не найден'}
        onRetry={loadAudit}
      />
    );
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

  const isActionDisabled = isSaving || isCompleting || audit.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/analyst/audits">
            <Button variant="ghost" size="icon" disabled={isActionDisabled}>
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
                  {question.description && (
                    <div className="text-sm text-muted-foreground mt-1 mb-2">
                       {question.description}
                    </div>
                  )}

                  {question.hasSubitems && question.subitems ? (
                    <div className="space-y-4 pl-4">
                      {question.subitems.map((subitem) => (
                        <div key={subitem.id} className="space-y-2">
                          <Label>{subitem.text}</Label>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-wrap gap-2">
                              {audit.version.questionnaire.scale.values.map((scaleValue) => {
                                const isSelected = answers[subitem.id]?.score === scaleValue.value;
                                const buttonVariant = isSelected ? 'default' : 'outline';
                                let buttonColor = '';
                                
                                // Цвета в зависимости от значения
                                if (scaleValue.value === 1) {
                                  buttonColor = isSelected ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-600 text-green-600 hover:bg-green-50';
                                } else if (scaleValue.value === 0.5) {
                                  buttonColor = isSelected ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'border-yellow-600 text-yellow-600 hover:bg-yellow-50';
                                } else if (scaleValue.value === 0) {
                                  buttonColor = isSelected ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-600 text-red-600 hover:bg-red-50';
                                }
                                
                                return (
                                  <Button
                                    key={scaleValue.value}
                                    type="button"
                                    variant={buttonVariant}
                                    size="sm"
                                    onClick={() => handleScoreChange(subitem.id, scaleValue.value)}
                                    disabled={isActionDisabled}
                                    className={buttonColor}
                                  >
                                    {scaleValue.label}
                                  </Button>
                                );
                              })}
                            </div>
                            <Textarea
                              placeholder="Комментарий (необязательно)"
                              value={answers[subitem.id]?.comment || ''}
                              onChange={(e) => handleCommentChange(subitem.id, e.target.value)}
                              rows={2}
                              disabled={isActionDisabled}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-wrap gap-2">
                        {audit.version.questionnaire.scale.values.map((scaleValue) => {
                          const isSelected = answers[question.id]?.score === scaleValue.value;
                          const buttonVariant = isSelected ? 'default' : 'outline';
                          let buttonColor = '';
                          
                          // Цвета в зависимости от значения
                          if (scaleValue.value === 1) {
                            buttonColor = isSelected ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-600 text-green-600 hover:bg-green-50';
                          } else if (scaleValue.value === 0.5) {
                            buttonColor = isSelected ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'border-yellow-600 text-yellow-600 hover:bg-yellow-50';
                          } else if (scaleValue.value === 0) {
                            buttonColor = isSelected ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-600 text-red-600 hover:bg-red-50';
                          }
                          
                          return (
                            <Button
                              key={scaleValue.value}
                              type="button"
                              variant={buttonVariant}
                              size="sm"
                              onClick={() => handleScoreChange(question.id, scaleValue.value)}
                              disabled={isActionDisabled}
                              className={buttonColor}
                            >
                              {scaleValue.label}
                            </Button>
                          );
                        })}
                      </div>
                      <Textarea
                        placeholder="Комментарий (необязательно)"
                        value={answers[question.id]?.comment || ''}
                        onChange={(e) => handleCommentChange(question.id, e.target.value)}
                        rows={2}
                        disabled={isActionDisabled}
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
                disabled={isActionDisabled}
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
                disabled={isActionDisabled}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isActionDisabled}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Сохранить
              </>
            )}
          </Button>
          {audit.status === 'DRAFT' && (
            <Button onClick={() => setIsCompleteDialogOpen(true)} variant="default" disabled={isActionDisabled}>
              {isCompleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Завершение...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Завершить аудит
                </>
              )}
            </Button>
          )}
        </div>
      </div>
        <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Завершить аудит?</DialogTitle>
            <DialogDescription>
              После завершения редактирование будет ограничено. Вы уверены, что хотите продолжить?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleComplete}>
              Завершить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
