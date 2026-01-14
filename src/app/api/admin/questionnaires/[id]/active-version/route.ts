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

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { versionId } = await request.json();

        if (!versionId) {
            return NextResponse.json({ error: 'Version ID is required' }, { status: 400 });
        }

        // Проверяем, что версия принадлежит этой анкете
        const version = await prisma.questionnaireVersion.findFirst({
            where: {
                id: versionId,
                questionnaireId: params.id,
            },
        });

        if (!version) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        // Обновляем анкету, устанавливая новую активную версию
        await prisma.questionnaire.update({
            where: { id: params.id },
            data: {
                currentVersionId: versionId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error setting active version:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
