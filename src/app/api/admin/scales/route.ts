import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getScoreScales } from '@/app/actions/questionnaires';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scales = await getScoreScales();
    return NextResponse.json(scales);
  } catch (error) {
    console.error('Error fetching scales:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
