import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'COMPANY') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = session.user.companyId!;

        // Get questionnaires through CompanyQuestionnaire join table
        const companyQuestionnaires = await prisma.companyQuestionnaire.findMany({
            where: {
                companyId,
            },
            select: {
                questionnaire: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                questionnaire: {
                    name: 'asc',
                },
            },
        });

        const questionnaires = companyQuestionnaires.map(cq => cq.questionnaire);
        return NextResponse.json(questionnaires);
    } catch (error: any) {
        console.error('Error fetching questionnaires:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
