'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getQuestionnaires() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const questionnaires = await prisma.questionnaire.findMany({
    where: { isActive: true },
    include: {
      scale: true,
      _count: {
        select: {
          versions: true,
          companies: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return questionnaires;
}

export async function getQuestionnaire(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: {
      scale: {
        include: {
          values: {
            orderBy: { order: 'asc' },
          },
        },
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: {
          metadataFields: {
            orderBy: { order: 'asc' },
          },
          questions: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: {
              subitems: {
                where: { isActive: true },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  if (!questionnaire) {
    return null;
  }

  // Добавляем флаг isActive для каждой версии на основе currentVersionId
  const versionsWithActiveFlag = questionnaire.versions.map(version => ({
    ...version,
    isActive: version.id === questionnaire.currentVersionId,
  }));

  return {
    ...questionnaire,
    versions: versionsWithActiveFlag,
  };
}

export async function getQuestionnaireVersion(versionId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const version = await prisma.questionnaireVersion.findUnique({
    where: { id: versionId },
    include: {
      questionnaire: {
        include: {
          scale: {
            include: {
              values: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
      questions: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        include: {
          subitems: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  return version;
}

export async function getCompanyQuestionnaires(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  // Проверяем доступ
  if (
    session.user.role === 'COMPANY' &&
    session.user.companyId !== companyId
  ) {
    throw new Error('Forbidden');
  }

  const questionnaires = await prisma.questionnaire.findMany({
    where: {
      isActive: true,
      companies: {
        some: {
          companyId,
          isEnabled: true,
        },
      },
    },
    include: {
      scale: {
        include: {
          values: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return questionnaires;
}

export async function createQuestionnaire(data: {
  name: string;
  description?: string;
  type: string;
  scaleId: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const questionnaire = await prisma.questionnaire.create({
    data: {
      name: data.name,
      description: data.description,
      type: data.type,
      scaleId: data.scaleId,
      isActive: true,
    },
  });

  // Создаем первую версию
  const version = await prisma.questionnaireVersion.create({
    data: {
      questionnaireId: questionnaire.id,
      versionNumber: 1,
      changeNotes: 'Первоначальная версия',
    },
  });

  // Обновляем currentVersionId
  await prisma.questionnaire.update({
    where: { id: questionnaire.id },
    data: { currentVersionId: version.id },
  });

  revalidatePath('/admin/questionnaires');
  return questionnaire;
}

export async function createQuestionnaireVersion(
  questionnaireId: string,
  changeNotes?: string
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Получаем текущую версию
  const currentVersion = await prisma.questionnaireVersion.findFirst({
    where: { questionnaireId },
    orderBy: { versionNumber: 'desc' },
    include: {
      questions: {
        include: {
          subitems: true,
        },
      },
    },
  });

  if (!currentVersion) {
    throw new Error('No existing version found');
  }

  // Создаем новую версию
  const newVersion = await prisma.questionnaireVersion.create({
    data: {
      questionnaireId,
      versionNumber: currentVersion.versionNumber + 1,
      changeNotes: changeNotes || 'Новая версия',
    },
  });

  // Копируем вопросы из предыдущей версии
  for (const question of currentVersion.questions) {
    const newQuestion = await prisma.question.create({
      data: {
        versionId: newVersion.id,
        text: question.text,
        description: question.description,
        explanation: question.explanation,
        category: question.category,
        weight: question.weight,
        order: question.order,
        isActive: question.isActive,
        hasSubitems: question.hasSubitems,
      },
    });

    // Копируем подпункты
    for (const subitem of question.subitems) {
      await prisma.questionSubitem.create({
        data: {
          questionId: newQuestion.id,
          text: subitem.text,
          weight: subitem.weight,
          order: subitem.order,
          isActive: subitem.isActive,
        },
      });
    }
  }

  // Обновляем currentVersionId
  await prisma.questionnaire.update({
    where: { id: questionnaireId },
    data: { currentVersionId: newVersion.id },
  });

  revalidatePath(`/admin/questionnaires/${questionnaireId}`);
  return newVersion;
}

export async function updateQuestion(
  id: string,
  data: {
    text?: string;
    description?: string;
    explanation?: string;
    category?: string;
    weight?: number;
    isActive?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const question = await prisma.question.update({
    where: { id },
    data,
  });

  revalidatePath('/admin/questionnaires');
  return question;
}

export async function getScoreScales() {
  const scales = await prisma.scoreScale.findMany({
    include: {
      values: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { isDefault: 'desc' },
  });

  return scales;
}
