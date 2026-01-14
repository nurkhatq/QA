'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getVersionMetadataFields(versionId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const fields = await prisma.questionnaireMetadataField.findMany({
    where: { versionId },
    orderBy: { order: 'asc' },
  });

  return fields;
}

export async function createMetadataField(data: {
  versionId: string;
  fieldName: string;
  fieldType: string;
  isRequired?: boolean;
  order?: number;
  options?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const field = await prisma.questionnaireMetadataField.create({
    data: {
      versionId: data.versionId,
      fieldName: data.fieldName,
      fieldType: data.fieldType,
      isRequired: data.isRequired ?? false,
      order: data.order ?? 0,
      options: data.options,
    },
  });

  revalidatePath('/admin/questionnaires');
  return field;
}

export async function updateMetadataField(
  id: string,
  data: {
    fieldName?: string;
    fieldType?: string;
    isRequired?: boolean;
    order?: number;
    options?: string;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const field = await prisma.questionnaireMetadataField.update({
    where: { id },
    data,
  });

  revalidatePath('/admin/questionnaires');
  return field;
}

export async function deleteMetadataField(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  await prisma.questionnaireMetadataField.delete({
    where: { id },
  });

  revalidatePath('/admin/questionnaires');
}
