import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAudit } from '@/app/actions/audits';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const audit = await getAudit(params.id);
    return NextResponse.json(audit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
