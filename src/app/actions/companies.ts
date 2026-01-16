'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getCompanies() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          users: true,
          audits: true,
          questionnaires: true,
        },
      },
    },
  });

  return companies;
}

export async function getCompany(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  // Админ может видеть любую компанию, компания - только свою
  if (session.user.role === 'COMPANY' && session.user.companyId !== id) {
    throw new Error('Forbidden');
  }

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      inputData: {
        orderBy: { order: 'asc' },
      },
      managers: {
        orderBy: { name: 'asc' },
      },
      questionnaires: {
        include: {
          questionnaire: true,
        },
      },
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  return company;
}

export async function createCompany(data: {
  name: string;
  description?: string;
  connectionDate?: Date;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const company = await prisma.company.create({
    data: {
      name: data.name,
      description: data.description,
      connectionDate: data.connectionDate || new Date(),
      isActive: true,
    },
  });

  revalidatePath('/admin/companies');
  return company;
}

export async function updateCompany(
  id: string,
  data: {
    description?: string;
    connectionDate?: Date;
    isActive?: boolean;
    isEmailReportingEnabled?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const company = await prisma.company.update({
    where: { id },
    data,
  });

  revalidatePath('/admin/companies');
  revalidatePath(`/admin/companies/${id}`);
  return company;
}

export async function deleteCompany(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  await prisma.company.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath('/admin/companies');
}

export async function setCompanyInputData(
  companyId: string,
  fields: Array<{ fieldName: string; fieldValue: string; isConfidential?: boolean; questionnaireId?: string | null; order: number }>
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Удаляем старые данные
  await prisma.companyInputData.deleteMany({
    where: { companyId },
  });

  // Создаем новые
  await prisma.companyInputData.createMany({
    data: fields.map((field) => ({
      companyId,
      fieldName: field.fieldName,
      fieldValue: field.fieldValue,
      isConfidential: field.isConfidential || false,
      questionnaireId: field.questionnaireId || null,
      order: field.order,
    })),
  });

  revalidatePath(`/admin/companies/${companyId}`);
}

export async function toggleQuestionnaireAccess(companyId: string, questionnaireId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const existing = await prisma.companyQuestionnaire.findUnique({
    where: {
      companyId_questionnaireId: {
        companyId,
        questionnaireId,
      },
    },
  });

  if (existing) {
    await prisma.companyQuestionnaire.update({
      where: {
        companyId_questionnaireId: {
          companyId,
          questionnaireId,
        },
      },
      data: {
        isEnabled: !existing.isEnabled,
      },
    });
  } else {
    await prisma.companyQuestionnaire.create({
      data: {
        companyId,
        questionnaireId,
        isEnabled: true,
      },
    });
  }

  revalidatePath(`/admin/companies/${companyId}`);
}
