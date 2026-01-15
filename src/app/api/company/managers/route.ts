import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'COMPANY') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = session.user.companyId!;

        const managers = await prisma.manager.findMany({
            where: {
                companyId,
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        return NextResponse.json(managers);
    } catch (error: any) {
        console.error('Error fetching managers:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
