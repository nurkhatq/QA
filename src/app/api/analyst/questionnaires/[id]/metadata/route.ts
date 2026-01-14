import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getVersionMetadataFields } from '@/app/actions/questionnaire-metadata';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ANALYST' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем анкету с её активной версией через currentVersionId
    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id: params.id },
      select: {
        currentVersionId: true,
      },
    });

    if (!questionnaire || !questionnaire.currentVersionId) {
      return NextResponse.json([]);
    }

    const fields = await getVersionMetadataFields(questionnaire.currentVersionId);
    return NextResponse.json(fields);
  } catch (error) {
    console.error('Error fetching metadata fields:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
