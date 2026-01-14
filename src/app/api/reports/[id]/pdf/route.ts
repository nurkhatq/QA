import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAudit, getAuditScore } from '@/app/actions/audits';
import { calculateCategoryScores } from '@/lib/calculations';
import { renderToStream } from '@react-pdf/renderer';
import { AuditPDFDocument } from '@/lib/pdf';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем аудит
    const audit = await getAudit(params.id);
    if (!audit || audit.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Audit not found or not completed' }, { status: 404 });
    }

    // Проверяем доступ
    if (session.user.role === 'COMPANY' && audit.companyId !== session.user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Получаем оценки
    const totalScore = await getAuditScore(params.id);
    const categoryScores = calculateCategoryScores({ answers: audit.answers });

    // Создаем map ответов
    const answersMap = new Map();
    audit.answers.forEach((answer) => {
      const key = answer.questionId || answer.subitemId;
      if (key) {
        answersMap.set(key, {
          score: answer.score,
          comment: answer.comment,
        });
      }
    });

    // Генерируем PDF
    const pdfDocument = AuditPDFDocument({
      audit,
      totalScore,
      categoryScores,
      answersMap,
    });

    const stream = await renderToStream(pdfDocument);

    // Возвращаем PDF как файл для скачивания
    const fileName = `Отчет_${audit.company.name}_${new Date(audit.auditDate).toLocaleDateString('ru-RU')}.pdf`;

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
