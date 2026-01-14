import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCompanyQuestionnaires } from '@/app/actions/company-questionnaires';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const questionnaires = await getCompanyQuestionnaires(params.id);

    // Возвращаем только включенные анкеты
    const enabledQuestionnaires = questionnaires.filter(q => q.isEnabled);

    return NextResponse.json(enabledQuestionnaires);
  } catch (error) {
    console.error('Error fetching company questionnaires:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
