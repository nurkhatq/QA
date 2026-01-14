import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getQuestionnaire } from '@/app/actions/questionnaires';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const questionnaire = await getQuestionnaire(params.id);
    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
    }

    return NextResponse.json(questionnaire);
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
