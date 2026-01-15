'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createQuestion(data: {
  versionId: string;
  text: string;
  description?: string;
  explanation?: string;
  category?: string;
  weight?: number;
  order?: number;
  hasSubitems?: boolean;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Получаем максимальный order для этой версии
  const maxOrderQuestion = await prisma.question.findFirst({
    where: { versionId: data.versionId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const newOrder = data.order ?? (maxOrderQuestion ? maxOrderQuestion.order + 1 : 0);

  const question = await prisma.question.create({
    data: {
      versionId: data.versionId,
      text: data.text,
      description: data.description,
      explanation: data.explanation,
      category: data.category,
      weight: data.weight ?? 1.0,
      order: newOrder,
      hasSubitems: data.hasSubitems ?? false,
      isActive: true,
    },
  });

  revalidatePath('/admin/questionnaires');
  return question;
}

export async function deleteQuestion(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Мягкое удаление - деактивация вопроса
  await prisma.question.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath('/admin/questionnaires');
}

export async function createSubitem(data: {
  questionId: string;
  text: string;
  weight?: number;
  order?: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Получаем максимальный order для этого вопроса
  const maxOrderSubitem = await prisma.questionSubitem.findFirst({
    where: { questionId: data.questionId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const newOrder = data.order ?? (maxOrderSubitem ? maxOrderSubitem.order + 1 : 0);

  const subitem = await prisma.questionSubitem.create({
    data: {
      questionId: data.questionId,
      text: data.text,
      weight: data.weight ?? 1.0,
      order: newOrder,
      isActive: true,
    },
  });

  // Обновляем вопрос - помечаем что у него есть подпункты
  await prisma.question.update({
    where: { id: data.questionId },
    data: { hasSubitems: true },
  });

  revalidatePath('/admin/questionnaires');
  return subitem;
}

export async function deleteSubitem(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Мягкое удаление - деактивация подпункта
  await prisma.questionSubitem.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath('/admin/questionnaires');
}

export async function updateQuestionCategory(
  versionId: string,
  oldCategory: string,
  newCategory: string
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  await prisma.question.updateMany({
    where: {
      versionId,
      category: oldCategory,
    },
    data: {
      category: newCategory,
    },
  });

  revalidatePath('/admin/questionnaires');
}
