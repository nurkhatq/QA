import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createMetadataField, getVersionMetadataFields } from '@/app/actions/questionnaire-metadata';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fields = await getVersionMetadataFields(params.id);
    return NextResponse.json(fields);
  } catch (error) {
    console.error('Error fetching metadata fields:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const field = await createMetadataField({
      versionId: params.id,
      ...body,
    });

    return NextResponse.json(field);
  } catch (error) {
    console.error('Error creating metadata field:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
