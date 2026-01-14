import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAudit } from '@/app/actions/audits';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const audit = await createAudit(body);

    return NextResponse.json(audit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
