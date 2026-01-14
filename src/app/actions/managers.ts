'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getManagers(companyId?: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const where: any = {
    isActive: true,
  };

  // Фильтр по компании
  if (companyId) {
    where.companyId = companyId;
  } else if (session.user.role === 'COMPANY') {
    // Если пользователь компания, показываем только её менеджеров
    where.companyId = session.user.companyId;
  }

  const managers = await prisma.manager.findMany({
    where,
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return managers;
}

export async function getManager(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const manager = await prisma.manager.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!manager) {
    throw new Error('Manager not found');
  }

  // Проверка доступа
  if (
    session.user.role === 'COMPANY' &&
    manager.companyId !== session.user.companyId
  ) {
    throw new Error('Forbidden');
  }

  return manager;
}

export async function createManager(data: {
  name: string;
  companyId: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const manager = await prisma.manager.create({
    data: {
      name: data.name,
      companyId: data.companyId,
    },
  });

  revalidatePath('/admin/companies');
  revalidatePath(`/admin/companies/${data.companyId}`);
  return manager;
}

export async function updateManager(
  id: string,
  data: {
    name?: string;
    isActive?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const manager = await prisma.manager.update({
    where: { id },
    data,
  });

  revalidatePath('/admin/companies');
  revalidatePath(`/admin/companies/${manager.companyId}`);
  return manager;
}

export async function deleteManager(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const manager = await prisma.manager.findUnique({
    where: { id },
  });

  if (!manager) {
    throw new Error('Manager not found');
  }

  // Мягкое удаление
  await prisma.manager.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath('/admin/companies');
  revalidatePath(`/admin/companies/${manager.companyId}`);
}
