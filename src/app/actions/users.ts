'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

export async function getUsers(roles?: UserRole[]) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const where: any = {};
  if (roles && roles.length > 0) {
    where.role = { in: roles };
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      assignedCompanies: {
        include: {
          company: true,
        },
      },
    },
  });

  return users;
}

export async function getEmployees() {
  return getUsers(['ADMIN', 'ANALYST']);
}

export async function getCompanyUsers() {
  return getUsers(['COMPANY']);
}

export async function getUser(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
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

  return user;
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  companyId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Проверяем, не существует ли уже пользователь с таким email
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role,
      companyId: data.companyId || null,
      isActive: true,
    },
  });

  revalidatePath('/admin/users');
  return user;
}

export async function updateUser(
  id: string,
  data: {
    email?: string;
    name?: string;
    role?: UserRole;
    companyId?: string | null;
    isActive?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...data,
      companyId: data.companyId === undefined ? undefined : data.companyId || null,
    },
  });

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${id}`);
  return user;
}

export async function resetUserPassword(id: string, newPassword: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  revalidatePath(`/admin/users/${id}`);
}

export async function deleteUser(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath('/admin/users');
}

export async function getAnalysts() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const analysts = await prisma.user.findMany({
    where: {
      role: 'ANALYST',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: 'asc' },
  });

  return analysts;
}
