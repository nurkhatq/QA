import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllQuestionnairesForCompany } from '@/app/actions/company-questionnaires';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const questionnaires = await getAllQuestionnairesForCompany(params.id);

    return NextResponse.json(questionnaires);
  } catch (error) {
    console.error('Error fetching all questionnaires for company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
