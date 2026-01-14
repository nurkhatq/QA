import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createQuestionnaireVersion } from '@/app/actions/questionnaires';

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
    const version = await createQuestionnaireVersion(params.id, body.changeNotes);

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
