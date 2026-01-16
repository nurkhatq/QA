import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        // Check authentication
        if (!session || session.user.role !== 'ANALYST') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { managerId } = await request.json();
        const auditId = params.id;

        // Validate input
        if (!managerId) {
            return NextResponse.json({ error: 'Manager ID is required' }, { status: 400 });
        }

        // Verify audit ownership/access
        const audit = await prisma.audit.findUnique({
            where: { id: auditId },
        });

        if (!audit || audit.analystId !== session.user.id) {
            // Also allow admins or maybe just check if audit exists and user has access
            // For now, strict ownership
            return NextResponse.json({ error: 'Audit not found or unauthorized' }, { status: 404 });
        }

        // Update audit manager
        const updatedAudit = await prisma.audit.update({
            where: { id: auditId },
            data: { managerId },
            include: { manager: true }
        });

        return NextResponse.json(updatedAudit);
    } catch (error: any) {
        console.error('Error updating audit manager:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
