'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function assignAnalystToCompany(companyId: string, userId: string) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        throw new Error('Unauthorized');
    }

    await prisma.companyAnalyst.create({
        data: {
            companyId,
            userId,
        },
    });

    revalidatePath(`/admin/companies/${companyId}`);
}

export async function removeAnalystFromCompany(companyId: string, userId: string) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        throw new Error('Unauthorized');
    }

    await prisma.companyAnalyst.delete({
        where: {
            companyId_userId: {
                companyId,
                userId,
            },
        },
    });

    revalidatePath(`/admin/companies/${companyId}`);
}

export async function getCompanyAnalysts(companyId: string) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error('Unauthorized');
    }

    const analysts = await prisma.companyAnalyst.findMany({
        where: { companyId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                },
            },
        },
    });

    return analysts.map(ca => ca.user);
}
