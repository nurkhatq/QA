import { NextRequest, NextResponse } from 'next/server';
import { getAuditReport } from '@/app/actions/company-stats';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const audit = await getAuditReport(params.id);
        return NextResponse.json(audit);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
