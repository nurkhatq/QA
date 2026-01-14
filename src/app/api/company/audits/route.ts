import { NextRequest, NextResponse } from 'next/server';
import { getCompanyAudits } from '@/app/actions/company-stats';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const filters: any = {};

        if (searchParams.get('startDate')) {
            filters.startDate = new Date(searchParams.get('startDate')!);
        }

        if (searchParams.get('endDate')) {
            filters.endDate = new Date(searchParams.get('endDate')!);
        }

        if (searchParams.get('managerId')) {
            filters.managerId = searchParams.get('managerId');
        }

        if (searchParams.get('questionnaireId')) {
            filters.questionnaireId = searchParams.get('questionnaireId');
        }

        if (searchParams.get('page')) {
            filters.page = parseInt(searchParams.get('page')!);
        }

        if (searchParams.get('pageSize')) {
            filters.pageSize = parseInt(searchParams.get('pageSize')!);
        }

        const result = await getCompanyAudits(filters);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
