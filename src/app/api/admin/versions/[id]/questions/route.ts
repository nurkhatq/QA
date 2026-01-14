import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createQuestion } from '@/app/actions/questions';

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
    const question = await createQuestion({
      versionId: params.id,
      ...body,
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
