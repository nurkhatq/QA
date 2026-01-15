import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ANALYST') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем все активные компании, к которым привязан аналитик
    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
        analysts: {
          some: {
            userId: session.user.id
          }
        }
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
