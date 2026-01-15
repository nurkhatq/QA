import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { setManagerInputData } from '@/app/actions/managers';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        await setManagerInputData(params.id, body.fields);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving manager input data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'ANALYST')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const inputData = await prisma.managerInputData.findMany({
            where: { managerId: params.id },
            orderBy: { order: 'asc' },
        });

        return NextResponse.json(inputData);
    } catch (error) {
        console.error('Error fetching manager input data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
