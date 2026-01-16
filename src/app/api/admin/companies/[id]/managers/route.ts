import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createManager } from '@/app/actions/managers';

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
    const manager = await createManager({
      name: body.name,
      companyId: params.id,
      email: body.email,
    });

    return NextResponse.json(manager);
  } catch (error) {
    console.error('Error creating manager:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
