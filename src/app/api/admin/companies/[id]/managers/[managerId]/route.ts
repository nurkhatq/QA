import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateManager } from '@/app/actions/managers';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; managerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const manager = await updateManager(params.managerId, body);

    return NextResponse.json(manager);
  } catch (error) {
    console.error('Error updating manager:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
