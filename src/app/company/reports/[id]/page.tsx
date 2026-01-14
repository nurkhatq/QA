import { getAudit, getAuditScore } from '@/app/actions/audits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { calculateCategoryScores } from '@/lib/calculations';
import { FileDown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ReportPage({ params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);

  if (!audit || audit.status !== 'COMPLETED') {
    return <div>Отчёт не найден или аудит не завершён</div>;
  }

  const totalScore = await getAuditScore(params.id);
  const categoryScores = calculateCategoryScores({ answers: audit.answers });

  // Группируем ответы по вопросам
  const answersMap = new Map();
  audit.answers.forEach((answer) => {
    const key = answer.questionId || answer.subitemId;
    if (key) {
      answersMap.set(key, answer);
    }
  });

  // Группируем вопросы по категориям
  const groupedQuestions = audit.version.questions.reduce((acc, question) => {
    const category = question.category || 'Без категории';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(question);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/company/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Отчёт аудита</h1>
            <p className="text-muted-foreground">{audit.version.questionnaire.name}</p>
          </div>
        </div>
        <Link href={`/api/reports/${params.id}/pdf`} target="_blank">
          <Button>
            <FileDown className="mr-2 h-4 w-4" />
            Экспорт в PDF
          </Button>
        </Link>
      </div>

      {/* Общая информация */}
      <Card>
        <CardHeader>
          <CardTitle>Информация об аудите</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Дата проведения</p>
              <p className="font-medium">{formatDateTime(audit.auditDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Аналитик</p>
              <p className="font-medium">{audit.analyst.name}</p>
            </div>
            {audit.manager && (
              <div>
                <p className="text-sm text-muted-foreground">Менеджер</p>
                <p className="font-medium">{audit.manager.name}</p>
              </div>
            )}
            {audit.metadata && audit.version.questionnaire.metadataFields?.map((field) => {
              const value = audit.metadata?.[field.id];
              if (!value) return null;

              return (
                <div key={field.id}>
                  <p className="text-sm text-muted-foreground">{field.fieldName}</p>
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
          </div>
        </CardContent>
      </Card>

      {/* Итоговая оценка */}
      <Card>
        <CardHeader>
          <CardTitle>Итоговая оценка</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-6xl font-bold text-primary">
              {(totalScore * 100).toFixed(0)}%
            </div>
            <div className="flex-1">
              <div className="h-4 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${totalScore * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Средний балл: {totalScore.toFixed(2)} из 1.0
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Оценка по категориям */}
      {categoryScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Оценка по категориям</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryScores.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{cat.category}</span>
                    <Badge variant="outline">
                      {(cat.score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${cat.score * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Детализация по вопросам */}
      <div className="space-y-4">
        {Object.entries(groupedQuestions).map(([category, questions]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((question: any) => {
                const answer = answersMap.get(question.id);
                const score = answer?.score;

                return (
                  <div key={question.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium">{question.text}</p>
                      {score !== null && score !== undefined && (
                        <Badge variant={score >= 0.8 ? 'default' : score >= 0.5 ? 'secondary' : 'destructive'}>
                          {score}
                        </Badge>
                      )}
                    </div>
                    {answer?.comment && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {answer.comment}
                      </p>
                    )}

                    {/* Подпункты */}
                    {question.hasSubitems && question.subitems && (
                      <div className="ml-4 mt-3 space-y-3">
                        {question.subitems.map((subitem: any) => {
                          const subAnswer = answersMap.get(subitem.id);
                          const subScore = subAnswer?.score;

                          return (
                            <div key={subitem.id}>
                              <div className="flex items-start justify-between">
                                <p className="text-sm">{subitem.text}</p>
                                {subScore !== null && subScore !== undefined && (
                                  <Badge
                                    variant={subScore >= 0.8 ? 'default' : subScore >= 0.5 ? 'secondary' : 'destructive'}
                                    className="ml-2"
                                  >
                                    {subScore}
                                  </Badge>
                                )}
                              </div>
                              {subAnswer?.comment && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {subAnswer.comment}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Итоговые комментарии */}
      {(audit.positiveComment || audit.negativeComment) && (
        <div className="grid gap-4 md:grid-cols-2">
          {audit.positiveComment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Что было хорошо?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{audit.positiveComment}</p>
              </CardContent>
            </Card>
          )}
          {audit.negativeComment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Плохо, над чем работать?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{audit.negativeComment}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
