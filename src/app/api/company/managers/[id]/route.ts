import { NextRequest, NextResponse } from 'next/server';
import { getManagerDetails } from '@/app/actions/company-stats';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const filters: any = {};

        if (searchParams.get('startDate')) {
            filters.startDate = new Date(searchParams.get('startDate')!);
        }

        if (searchParams.get('endDate')) {
            filters.endDate = new Date(searchParams.get('endDate')!);
        }

        if (searchParams.get('questionnaireId')) {
            filters.questionnaireId = searchParams.get('questionnaireId');
        }

        const stats = await getManagerDetails(params.id, filters);
        return NextResponse.json(stats);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
