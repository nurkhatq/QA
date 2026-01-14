import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getManagers } from '@/app/actions/managers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ANALYST' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const managers = await getManagers(params.id);
    return NextResponse.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
