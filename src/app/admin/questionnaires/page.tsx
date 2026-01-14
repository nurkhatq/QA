import { getQuestionnaires } from '@/app/actions/questionnaires';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function QuestionnairesPage() {
  const questionnaires = await getQuestionnaires();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Анкеты</h1>
          <p className="text-muted-foreground">Управление анкетами для аудита</p>
        </div>
        <Link href="/admin/questionnaires/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Создать анкету
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все анкеты</CardTitle>
          <CardDescription>
            Всего анкет: {questionnaires.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Версии</TableHead>
                <TableHead>Компании</TableHead>
                <TableHead>Шкала оценок</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionnaires.map((questionnaire) => (
                <TableRow key={questionnaire.id}>
                  <TableCell className="font-medium">{questionnaire.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{questionnaire.type}</Badge>
                  </TableCell>
                  <TableCell>{questionnaire._count.versions}</TableCell>
                  <TableCell>{questionnaire._count.companies}</TableCell>
                  <TableCell>{questionnaire.scale.name}</TableCell>
                  <TableCell>
                    <Link href={`/admin/questionnaires/${questionnaire.id}`}>
                      <Button variant="outline" size="sm">
                        Редактировать
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {questionnaires.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Нет анкет
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
