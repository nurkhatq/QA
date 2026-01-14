import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setCompanyInputData } from '@/app/actions/companies';

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
    await setCompanyInputData(params.id, body.fields);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving input data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
