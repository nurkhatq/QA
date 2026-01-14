'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getCompanyQuestionnaires(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const questionnaires = await prisma.companyQuestionnaire.findMany({
    where: { companyId },
    include: {
      questionnaire: {
        include: {
          scale: true,
          versions: {
            where: { isActive: true },
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  return questionnaires.map((cq) => ({
    id: cq.id,
    companyId: cq.companyId,
    questionnaireId: cq.questionnaireId,
    questionnaireName: cq.questionnaire.name,
    questionnaireType: cq.questionnaire.type,
    questionnaireDescription: cq.questionnaire.description,
    isEnabled: cq.isEnabled,
    currentVersionId: cq.questionnaire.versions[0]?.id,
    createdAt: cq.createdAt,
  }));
}

export async function toggleCompanyQuestionnaire(
  companyId: string,
  questionnaireId: string,
  isEnabled: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Проверяем существует ли связь
  const existing = await prisma.companyQuestionnaire.findUnique({
    where: {
      companyId_questionnaireId: {
        companyId,
        questionnaireId,
      },
    },
  });

  if (existing) {
    // Обновляем существующую связь
    return await prisma.companyQuestionnaire.update({
      where: { id: existing.id },
      data: { isEnabled },
    });
  } else if (isEnabled) {
    // Создаем новую связь если включаем
    return await prisma.companyQuestionnaire.create({
      data: {
        companyId,
        questionnaireId,
        isEnabled: true,
      },
    });
  }

  return null;
}

export async function getAllQuestionnairesForCompany(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Получаем все анкеты
  const allQuestionnaires = await prisma.questionnaire.findMany({
    where: { isActive: true },
    include: {
      scale: true,
      companies: {
        where: { companyId },
      },
    },
    orderBy: { name: 'asc' },
  });

  return allQuestionnaires.map((q) => ({
    id: q.id,
    name: q.name,
    type: q.type,
    description: q.description,
    isEnabled: q.companies.length > 0 && q.companies[0].isEnabled,
  }));
}
