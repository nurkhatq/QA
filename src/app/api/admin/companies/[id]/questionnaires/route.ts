import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { toggleCompanyQuestionnaire } from '@/app/actions/company-questionnaires';

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
    const { questionnaireId } = body;

    // Получаем текущее состояние
    const { prisma } = await import('@/lib/prisma');
    const existing = await prisma.companyQuestionnaire.findUnique({
      where: {
        companyId_questionnaireId: {
          companyId: params.id,
          questionnaireId,
        },
      },
    });

    const newState = !existing?.isEnabled;

    await toggleCompanyQuestionnaire(params.id, questionnaireId, newState);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling company questionnaire:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
