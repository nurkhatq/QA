import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'ANALYST') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { metadata } = await request.json();
        const auditId = params.id;

        // Update audit metadata
        const audit = await prisma.audit.update({
            where: { id: auditId },
            data: { metadata },
        });

        return NextResponse.json(audit);
    } catch (error: any) {
        console.error('Error updating metadata:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
