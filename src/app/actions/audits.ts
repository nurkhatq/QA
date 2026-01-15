'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { AuditStatus } from '@prisma/client';
import { calculateAuditScore, calculateCategoryScores } from '@/lib/calculations';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export async function getAudits(filters?: {
  companyId?: string;
  analystId?: string;
  status?: AuditStatus;
  questionnaireId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const where: any = {
    isDeleted: false,
  };

  // Фильтры доступа по ролям
  if (session.user.role === 'COMPANY') {
    where.companyId = session.user.companyId;
  } else if (session.user.role === 'ANALYST') {
    if (!filters?.companyId) {
      where.analystId = session.user.id;
    }
  }

  // Дополнительные фильтры
  if (filters?.companyId) where.companyId = filters.companyId;
  if (filters?.analystId) where.analystId = filters.analystId;
  if (filters?.status) where.status = filters.status;

  if (filters?.questionnaireId) {
    where.version = {
      questionnaireId: filters.questionnaireId,
    };
  }

  const audits = await prisma.audit.findMany({
    where,
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      manager: {
        select: {
          id: true,
          name: true,
        },
      },
      analyst: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      version: {
        include: {
          questionnaire: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
      answers: {
        include: {
          question: true,
          subitem: true,
        },
      },
    },
    orderBy: { auditDate: 'desc' },
  });

  return audits;
}

export async function getAudit(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          inputData: {
            orderBy: { order: 'asc' },
          },
        },
      },
      manager: {
        select: {
          id: true,
          name: true,
        },
      },
      analyst: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      version: {
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
      answers: {
        include: {
          question: {
            select: {
              id: true,
              text: true,
              category: true,
              weight: true,
              isActive: true,
              hasSubitems: true,
            },
          },
          subitem: {
            select: {
              id: true,
              text: true,
              weight: true,
              isActive: true,
            },
          },
        },
      },
      history: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!audit) {
    throw new Error('Audit not found');
  }

  // Проверка доступа
  if (
    session.user.role === 'COMPANY' &&
    audit.companyId !== session.user.companyId
  ) {
    throw new Error('Forbidden');
  }

  if (
    session.user.role !== 'ADMIN' &&
    session.user.role !== 'COMPANY' &&
    (session.user.role !== 'ANALYST' || audit.analystId !== session.user.id)
  ) {
    throw new Error('Forbidden');
  }

  return audit;
}

export async function createAudit(data: {
  companyId: string;
  managerId?: string;
  versionId: string;
  auditDate?: Date;
  metadata?: any;
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ANALYST' && session.user.role !== 'ADMIN')) {
    throw new Error('Unauthorized');
  }

  const audit = await prisma.audit.create({
    data: {
      companyId: data.companyId,
      managerId: data.managerId || null,
      versionId: data.versionId,
      analystId: session.user.id,
      status: 'DRAFT',
      auditDate: data.auditDate || new Date(),
      metadata: data.metadata || null,
    },
  });

  // Создаем запись в истории
  await prisma.auditHistory.create({
    data: {
      auditId: audit.id,
      userId: session.user.id,
      action: 'CREATED',
      comment: 'Аудит создан',
    },
  });

  revalidatePath('/analyst/audits');
  return audit;
}

export async function updateAuditAnswers(
  auditId: string,
  answers: Array<{
    questionId?: string;
    subitemId?: string;
    score: number | null;
    comment?: string;
  }>
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
  });

  if (!audit) {
    throw new Error('Audit not found');
  }

  // Проверка прав
  if (
    session.user.role !== 'ADMIN' &&
    (session.user.role !== 'ANALYST' || audit.analystId !== session.user.id)
  ) {
    throw new Error('Forbidden');
  }

  // Удаляем старые ответы
  await prisma.auditAnswer.deleteMany({
    where: { auditId },
  });

  // Создаем новые ответы
  await prisma.auditAnswer.createMany({
    data: answers.map((answer) => ({
      auditId,
      questionId: answer.questionId || null,
      subitemId: answer.subitemId || null,
      score: answer.score,
      comment: answer.comment || null,
    })),
  });

  // Обновляем дату изменения
  await prisma.audit.update({
    where: { id: auditId },
    data: { updatedAt: new Date() },
  });

  // Добавляем запись в историю
  await prisma.auditHistory.create({
    data: {
      auditId,
      userId: session.user.id,
      action: 'UPDATED',
      comment: 'Ответы обновлены',
    },
  });

  revalidatePath(`/analyst/audits/${auditId}`);
}

export async function updateAuditComments(
  auditId: string,
  data: {
    positiveComment?: string;
    negativeComment?: string;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
  });

  if (!audit) {
    throw new Error('Audit not found');
  }

  // Проверка прав
  if (
    session.user.role !== 'ADMIN' &&
    (session.user.role !== 'ANALYST' || audit.analystId !== session.user.id)
  ) {
    throw new Error('Forbidden');
  }

  await prisma.audit.update({
    where: { id: auditId },
    data: {
      positiveComment: data.positiveComment,
      negativeComment: data.negativeComment,
    },
  });

  revalidatePath(`/analyst/audits/${auditId}`);
}

// Функция расчета итогового балла аудита и сохранения его в БД
async function calculateAndSaveAuditScore(auditId: string): Promise<number> {
  // Получаем аудит с ответами и вопросами
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      answers: {
        include: {
          question: {
            select: {
              weight: true,
              isActive: true,
            },
          },
          subitem: {
            select: {
              weight: true,
              isActive: true,
            },
          },
        },
      },
      version: {
        include: {
          questions: {
            where: { isActive: true },
            include: {
              subitems: {
                where: { isActive: true },
              },
            },
          },
          questionnaire: {
            include: {
              scale: {
                include: {
                  values: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!audit) {
    throw new Error('Audit not found');
  }

  // Находим максимальное значение шкалы
  const maxScaleValue = Math.max(
    ...audit.version.questionnaire.scale.values.map((v) => v.value)
  );

  // Вычисляем максимально возможный балл
  let maxPossibleScore = 0;
  audit.version.questions.forEach((question) => {
    if (question.hasSubitems && question.subitems.length > 0) {
      question.subitems.forEach((subitem) => {
        maxPossibleScore += subitem.weight * maxScaleValue;
      });
    } else {
      maxPossibleScore += question.weight * maxScaleValue;
    }
  });

  // Вычисляем фактически набранный балл
  let actualScore = 0;
  audit.answers.forEach((answer) => {
    const score = answer.score ?? 0;
    if (answer.subitemId && answer.subitem) {
      actualScore += answer.subitem.weight * score;
    } else if (answer.question) {
      actualScore += answer.question.weight * score;
    }
  });

  // Вычисляем процент
  const totalScore = maxPossibleScore > 0
    ? Math.round((actualScore / maxPossibleScore) * 100 * 100) / 100
    : 0;

  return totalScore;
}

import { sendAuditCompletionEmail } from '@/lib/email';

// ... (existing imports)

export async function completeAudit(auditId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      company: {
        include: {
          users: true,
        },
      },
      version: {
        include: {
          questionnaire: true,
        },
      },
    },
  });

  if (!audit) {
    throw new Error('Audit not found');
  }

  // Проверка прав
  if (
    session.user.role !== 'ADMIN' &&
    (session.user.role !== 'ANALYST' || audit.analystId !== session.user.id)
  ) {
    throw new Error('Forbidden');
  }

  // Вычисляем итоговый балл
  const totalScore = await calculateAndSaveAuditScore(auditId);

  await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      totalScore,
    },
  });

  // Добавляем запись в историю
  await prisma.auditHistory.create({
    data: {
      auditId,
      userId: session.user.id,
      action: 'STATUS_CHANGED',
      comment: 'Аудит завершён',
    },
  });

  // Отправка уведомлений на почту
  const companyUsers = audit.company.users.filter(u => u.role === 'COMPANY' && u.isActive);

  if (companyUsers.length > 0) {
    console.log(`Sending emails to ${companyUsers.length} company users...`);

    // Подготовка данных для письма
    // Нам нужен объект audit с ответами для расчета категорий. 
    // audit из findUnique выше может не содержать всех ответов/вопросов если include был неполный?
    // Мы делали include simplified. Давайте сделаем полноценный запрос или используем результат calculateAndSaveAuditScore если он возвращает данные (он возвращает число).
    // ЛУЧШЕ: Запросим полные данные аудита заново, так надежнее, чем городить include в начале.

    const fullAudit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        manager: true,
        company: {
          include: { users: true }
        },
        version: {
          include: {
            questionnaire: true,
            questions: {
              where: { isActive: true },
              include: { subitems: true }
            }
          }
        },
        answers: {
          include: {
            question: true,
            subitem: true
          }
        }
      }
    });

    if (fullAudit) {
      const categoryScores = calculateCategoryScores({ answers: fullAudit.answers });

      await Promise.allSettled(
        companyUsers.map(user =>
          sendAuditCompletionEmail({
            to: user.email,
            companyName: fullAudit.company.name,
            auditName: fullAudit.version.questionnaire.name,
            score: totalScore,
            auditId: fullAudit.id,
            managerName: fullAudit.manager?.name || 'Не указан',
            auditDate: format(fullAudit.auditDate, 'dd MMMM yyyy, HH:mm', { locale: ru }),
            categories: categoryScores.map((c) => ({ name: c.category, score: c.score })),
            positiveComment: fullAudit.positiveComment || undefined,
            negativeComment: fullAudit.negativeComment || undefined,
          })
        )
      );
    }
  }

  revalidatePath('/analyst/audits');
  revalidatePath(`/analyst/audits/${auditId}`);
}

export async function deleteAudit(auditId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ANALYST' && session.user.role !== 'ADMIN')) {
    throw new Error('Unauthorized');
  }

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
  });

  if (!audit) {
    throw new Error('Audit not found');
  }

  // Проверка прав
  if (
    session.user.role === 'ANALYST' &&
    audit.analystId !== session.user.id
  ) {
    throw new Error('Forbidden');
  }

  // Мягкое удаление
  await prisma.audit.update({
    where: { id: auditId },
    data: { isDeleted: true },
  });

  // Добавляем запись в историю
  await prisma.auditHistory.create({
    data: {
      auditId,
      userId: session.user.id,
      action: 'DELETED',
      comment: 'Аудит удалён',
    },
  });

  revalidatePath('/analyst/audits');
  revalidatePath('/admin/audits');
}

export async function getAuditScore(auditId: string) {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      answers: {
        include: {
          question: {
            select: {
              weight: true,
              isActive: true,
              hasSubitems: true,
              category: true,
            },
          },
          subitem: {
            select: {
              weight: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!audit) {
    throw new Error('Audit not found');
  }

  const score = calculateAuditScore({ answers: audit.answers });

  return score;
}
