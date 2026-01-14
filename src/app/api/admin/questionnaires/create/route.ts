import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, type, scaleId, questions } = body;

    // Валидация
    if (!name || !type || !scaleId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'At least one question is required' }, { status: 400 });
    }

    // Создаем анкету
    const questionnaire = await prisma.questionnaire.create({
      data: {
        name,
        description: description || null,
        type,
        scaleId,
        isActive: true,
      },
    });

    // Создаем первую версию
    const version = await prisma.questionnaireVersion.create({
      data: {
        questionnaireId: questionnaire.id,
        versionNumber: 1,
        isActive: true,
        changeNotes: 'Первоначальная версия',
      },
    });

    // Создаем вопросы
    for (const question of questions) {
      const createdQuestion = await prisma.question.create({
        data: {
          versionId: version.id,
          text: question.text,
          description: question.description || null,
          explanation: question.explanation || null,
          category: question.category || null,
          weight: question.weight || 1.0,
          order: question.order,
          isActive: true,
          hasSubitems: question.subitems && question.subitems.length > 0,
        },
      });

      // Создаем подпункты, если есть
      if (question.subitems && question.subitems.length > 0) {
        for (const subitem of question.subitems) {
          await prisma.questionSubitem.create({
            data: {
              questionId: createdQuestion.id,
              text: subitem.text,
              weight: subitem.weight || 1.0,
              order: subitem.order,
              isActive: true,
            },
          });
        }
      }
    }

    // Обновляем currentVersionId
    await prisma.questionnaire.update({
      where: { id: questionnaire.id },
      data: { currentVersionId: version.id },
    });

    revalidatePath('/admin/questionnaires');
    return NextResponse.json(questionnaire);
  } catch (error) {
    console.error('Error creating questionnaire:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
