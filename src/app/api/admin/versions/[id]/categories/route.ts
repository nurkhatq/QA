import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateQuestionCategory } from '@/app/actions/questions';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { oldCategory, newCategory } = await request.json();

        if (!oldCategory || !newCategory) {
            return NextResponse.json(
                { error: 'Old and new category names are required' },
                { status: 400 }
            );
        }

        await updateQuestionCategory(params.id, oldCategory, newCategory);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating question category:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
