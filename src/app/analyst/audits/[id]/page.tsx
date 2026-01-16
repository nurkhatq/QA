'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Save, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { FullPageSpinner } from '@/components/spinner';
import { FullPageError } from '@/components/error-card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  saveAnswersDraft,
  loadAnswersDraft,
  clearAnswersDraft,
} from '@/lib/draft-manager';

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
  manager?: { 
    name: string;
    inputData: Array<{
      id: string;
      fieldName: string;
      fieldValue: string;
      isConfidential: boolean;
      order: number;
    }>;
  } | null;
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
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // ВАЖНО: Сначала проверяем draft, он имеет приоритет!
      const draft = loadAnswersDraft(params.id as string);
      if (draft && Object.keys(draft.answers).length > 0) {
        // Используем draft вместо данных с сервера
        setAnswers(draft.answers);
        toast({
          title: "Прогресс восстановлен",
          description: "Ваши ответы были автоматически восстановлены",
        });
      } else {
        // Нет draft - используем данные с сервера
        setAnswers(answersMap);
      }
      
      setPositiveComment(data.positiveComment || '');
      setNegativeComment(data.negativeComment || '');
      setMetadata(data.metadata || {});
    } catch (err) {
      console.error('Error loading audit:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке');
    } finally {
      setLoading(false);
    }
  }

  // Auto-fill date fields with today's date
  useEffect(() => {
    if (!audit || !audit.version.metadataFields) return;
    
    const today = new Date().toISOString().split('T')[0];
    const newMetadata = { ...metadata };
    let hasChanges = false;
    
    audit.version.metadataFields.forEach((field) => {
      if (field.fieldType === 'date' && !newMetadata[field.id]) {
        newMetadata[field.id] = today;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setMetadata(newMetadata);
    }
  }, [audit?.version.metadataFields]);

  // Calculate progress
  useEffect(() => {
    if (!audit) return;
    
    const totalQuestions = audit.version.questions.reduce((sum, q) => {
      if (q.hasSubitems && q.subitems) {
        return sum + q.subitems.length;
      }
      return sum + 1;
    }, 0);
    
    const answeredQuestions = Object.values(answers).filter(a => a.score !== null).length;
    const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
    setProgress(progressPercent);
  }, [answers, audit]);

  // Auto-save draft
  const saveCurrentDraft = useCallback(() => {
    if (!audit || !params.id) return;
    
    saveAnswersDraft(params.id as string, answers);
    setLastSaved(Date.now());
  }, [audit, params.id, answers]);

  // Debounced save on answer change
  useEffect(() => {
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    
    if (Object.keys(answers).length > 0) {
      saveDebounceTimerRef.current = setTimeout(() => {
        saveCurrentDraft();
      }, 2000); // 2 seconds
    }
    
    return () => {
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
      }
    };
  }, [answers, saveCurrentDraft]);

  // Auto-save timer (every 30 seconds)
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    if (Object.keys(answers).length > 0) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveCurrentDraft();
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [answers, saveCurrentDraft]);

  // Restore draft
  const restoreDraft = useCallback(() => {
    const draft = loadAnswersDraft(params.id as string);
    if (draft) {
      setAnswers(draft.answers);
      setHasDraft(false);
      toast({
        title: "Прогресс восстановлен",
        description: "Ваши ответы были восстановлены",
      });
    }
  }, [params.id, toast]);

  const dismissDraft = useCallback(() => {
    clearAnswersDraft(params.id as string);
    setHasDraft(false);
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

    // Validate required metadata fields
    const missingMetadataFields = audit.version.metadataFields
      .filter((field: any) => field.isRequired && !metadata[field.id])
      .map((field: any) => field.fieldName);

    if (missingMetadataFields.length > 0) {
      toast({
        title: 'Ошибка',
        description: `Заполните обязательные поля: ${missingMetadataFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

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

      // Сохраняем metadata
      const metadataResponse = await fetch(`/api/audits/${audit.id}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });

      if (!metadataResponse.ok) {
        throw new Error('Не удалось сохранить информацию о сделке');
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
      
      // Clear draft
      clearAnswersDraft(params.id as string);

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
            <div className="flex items-center gap-2 text-muted-foreground">
              <p>{audit.version.questionnaire.name}</p>
              <span>•</span>
              <p>Менеджер: {audit.manager?.name || 'Не указан'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={audit.status === 'COMPLETED' ? 'default' : 'secondary'}>
            {audit.status === 'COMPLETED' ? 'Завершён' : 'Черновик'}
          </Badge>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
        {/* Информация о сделке (метаданные) */}
        {audit.version.metadataFields && audit.version.metadataFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Информация о сделке</CardTitle>
              <CardDescription>Заполните данные о проверяемом взаимодействии</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {audit.manager && (
                <div className="space-y-2">
                  <Label>Менеджер</Label>
                  <Input value={audit.manager.name} disabled className="bg-muted" />
                </div>
              )}
              {audit.version.metadataFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.fieldName}
                    {(field as any).isRequired && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.fieldType === 'text' && (
                    <Input
                      id={field.id}
                      value={metadata[field.id] || ''}
                      onChange={(e) => setMetadata({ ...metadata, [field.id]: e.target.value })}
                      placeholder={`Введите ${field.fieldName.toLowerCase()}`}
                      disabled={isActionDisabled}
                    />
                  )}
                  {field.fieldType === 'date' && (
                    <Input
                      id={field.id}
                      type="date"
                      value={metadata[field.id] || ''}
                      onChange={(e) => setMetadata({ ...metadata, [field.id]: e.target.value })}
                      disabled={isActionDisabled}
                    />
                  )}
                  {field.fieldType === 'url' && (
                    <Input
                      id={field.id}
                      type="url"
                      value={metadata[field.id] || ''}
                      onChange={(e) => setMetadata({ ...metadata, [field.id]: e.target.value })}
                      placeholder="https://..."
                      disabled={isActionDisabled}
                    />
                  )}
                  {field.fieldType === 'number' && (
                    <Input
                      id={field.id}
                      type="number"
                      value={metadata[field.id] || ''}
                      onChange={(e) => setMetadata({ ...metadata, [field.id]: e.target.value })}
                      placeholder="0"
                      disabled={isActionDisabled}
                    />
                  )}
                  {field.fieldType === 'textarea' && (
                    <Textarea
                      id={field.id}
                      value={metadata[field.id] || ''}
                      onChange={(e) => setMetadata({ ...metadata, [field.id]: e.target.value })}
                      placeholder={`Введите ${field.fieldName.toLowerCase()}`}
                      rows={3}
                      disabled={isActionDisabled}
                    />
                  )}
                  {field.fieldType === 'radio' && (field as any).options && (
                    <RadioGroup
                       value={metadata[field.id] || ''}
                       onValueChange={(value) => setMetadata({ ...metadata, [field.id]: value })}
                       className="flex flex-col space-y-2"
                       disabled={isActionDisabled}
                    >
                      {(field as any).options.split(';').map((option: string) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`${field.id}-${option}`} disabled={isActionDisabled} />
                          <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
            <Button onClick={() => {
              // Проверка, что на все вопросы даны ответы
              const unanswered: string[] = [];
              audit.version.questions.forEach(q => {
                if (q.hasSubitems && q.subitems) {
                  q.subitems.forEach(s => {
                    if (answers[s.id]?.score === undefined || answers[s.id]?.score === null) {
                      unanswered.push(s.text);
                    }
                  });
                } else {
                  if (answers[q.id]?.score === undefined || answers[q.id]?.score === null) {
                    unanswered.push(q.text);
                  }
                }
              });

              if (unanswered.length > 0) {
                toast({
                  title: "Невозможно завершить аудит",
                  description: `Необходимо ответить на все вопросы. Осталось: ${unanswered.length}`,
                  variant: "destructive"
                });
                return;
              }

              setIsCompleteDialogOpen(true);
            }} variant="default" disabled={isActionDisabled}>
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
      
      <div className="space-y-6 lg:sticky lg:top-4">
        {/* Вводные данные компании */}
        {(() => {
          const relevantInputData = audit.company.inputData.filter(
            (data: any) => !data.questionnaireId || data.questionnaireId === audit.version.questionnaire.id
          );
          
          if (relevantInputData.length === 0) return null;
          
          return (
            <Card>
              <CardHeader>
                <CardTitle>Вводные данные компании</CardTitle>
                <CardDescription>
                  Скрипты, регламенты и доступы
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {relevantInputData.map((data: any) => (
                  <div key={data.id} className="space-y-2">
                    <Label className="font-semibold">{data.fieldName}</Label>
                    <div className="text-sm p-3 bg-muted rounded-md whitespace-pre-wrap">
                      {data.fieldValue}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })()}

        {/* Вводные данные менеджера */}
        {audit.manager?.inputData && audit.manager.inputData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Вводные данные менеджера</CardTitle>
              <CardDescription>
                Персональные скрипты и доступы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {audit.manager.inputData.map((data: any) => (
                <div key={data.id} className="space-y-2">
                  <Label className="font-semibold">{data.fieldName}</Label>
                  <div className="text-sm p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {data.fieldValue}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
