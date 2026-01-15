import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteMetadataField, updateMetadataField } from '@/app/actions/questionnaire-metadata';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const updated = await updateMetadataField(params.fieldId, data);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating metadata field:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteMetadataField(params.fieldId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting metadata field:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
