'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { calculateCategoryScores } from '@/lib/calculations';

export async function getCompanyStats(filters?: {
    startDate?: Date;
    endDate?: Date;
    managerId?: string;
    questionnaireId?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'COMPANY') {
        throw new Error('Unauthorized');
    }

    const companyId = session.user.companyId!;

    const where: any = {
        companyId,
        status: 'COMPLETED',
        isDeleted: false,
    };

    if (filters?.startDate) {
        where.auditDate = { ...where.auditDate, gte: filters.startDate };
    }

    if (filters?.endDate) {
        where.auditDate = { ...where.auditDate, lte: filters.endDate };
    }

    if (filters?.managerId) {
        where.managerId = filters.managerId;
    }

    if (filters?.questionnaireId) {
        where.version = {
            questionnaireId: filters.questionnaireId,
        };
    }

    // Получаем все завершенные аудиты
    const audits = await prisma.audit.findMany({
        where,
        select: {
            id: true,
            totalScore: true,
            auditDate: true,
            manager: {
                select: {
                    id: true,
                    name: true,
                },
            },
            version: {
                select: {
                    questionnaire: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                        },
                    },
                },
            },
            answers: {
                include: {
                    question: {
                        select: {
                            weight: true,
                            isActive: true,
                            hasSubitems: true,
                            category: true,
                        },
                    },
                    subitem: {
                        select: {
                            weight: true,
                            isActive: true,
                        },
                    },
                },
            },
        },
        orderBy: { auditDate: 'asc' },
    });

    // Вычисляем статистику
    const totalAudits = audits.length;
    const averageScore = totalAudits > 0
        ? audits.reduce((sum, audit) => sum + (audit.totalScore || 0), 0) / totalAudits
        : 0;

    // Группируем по месяцам для графика динамики и категорий
    const monthlyData = audits.reduce((acc, audit) => {
        const month = format(new Date(audit.auditDate), 'yyyy-MM');
        if (!acc[month]) {
            acc[month] = {
                scores: [],
                count: 0,
                categoryScores: new Map<string, { total: number, count: number }>()
            };
        }
        acc[month].scores.push(audit.totalScore || 0);
        acc[month].count++;

        // Считаем категории для этого аудита
        const auditCategoryScores = calculateCategoryScores({ answers: audit.answers });
        auditCategoryScores.forEach(catScore => {
            const current = acc[month].categoryScores.get(catScore.category) || { total: 0, count: 0 };
            acc[month].categoryScores.set(catScore.category, {
                total: current.total + catScore.score, // catScore.score is 0-1 (normalized?), actually calculateCategoryScores returns weighted score logic. 
                // Wait, calculateCategoryScores returns score for that category based on weights. 
                // Let's verify calculateCategoryScores return value.
                // It returns `score`: totalWeightedScore / totalWeight. This is 0 to 1 usually? 
                // Let's check calculations.ts again.
                // Yes, it returns score. If weights are regular numbers, score is effectively normalized if max score is achieved.
                // IMPORTANT: calculateCategoryScores returns score ratio (0 to 1) NOT percentage?
                // No, wait. 
                // totalWeightedScore += score * weight.
                // If score is 0-1 range (from scale), then result is 0-1.
                // If score is e.g. 0, 0.5, 1. The result is 0-1.
                // So we should multiply by 100 later or here.
                count: current.count + 1
            });
        });

        return acc;
    }, {} as Record<string, {
        scores: number[];
        count: number;
        categoryScores: Map<string, { total: number, count: number }>
    }>);

    const timeline = Object.entries(monthlyData).map(([month, data]) => {
        const categoryData: Record<string, number> = {};
        data.categoryScores.forEach((stats, category) => {
            // Average score for this category in this month (in percentage)
            categoryData[category] = Math.round((stats.total / stats.count) * 100 * 10) / 10;
        });

        return {
            month,
            averageScore: data.scores.reduce((a, b) => a + b, 0) / data.count,
            count: data.count,
            categories: categoryData
        };
    });

    // Распределение оценок по диапазонам
    const distribution = {
        excellent: audits.filter(a => (a.totalScore || 0) >= 90).length,
        good: audits.filter(a => (a.totalScore || 0) >= 70 && (a.totalScore || 0) < 90).length,
        average: audits.filter(a => (a.totalScore || 0) >= 50 && (a.totalScore || 0) < 70).length,
        poor: audits.filter(a => (a.totalScore || 0) < 50).length,
    };

    // Статистика по менеджерам
    const managerStats = audits.reduce((acc, audit) => {
        if (!audit.manager) return acc;

        const managerId = audit.manager.id;
        if (!acc[managerId]) {
            acc[managerId] = {
                id: managerId,
                name: audit.manager.name,
                scores: [],
                count: 0,
            };
        }
        acc[managerId].scores.push(audit.totalScore || 0);
        acc[managerId].count++;
        return acc;
    }, {} as Record<string, { id: string; name: string; scores: number[]; count: number }>);

    const managers = Object.values(managerStats).map(manager => ({
        id: manager.id,
        name: manager.name,
        averageScore: manager.scores.reduce((a, b) => a + b, 0) / manager.count,
        auditCount: manager.count,
    }));

    // Статистика по анкетам
    const questionnaireStats = audits.reduce((acc, audit) => {
        const qId = audit.version.questionnaire.id;
        if (!acc[qId]) {
            acc[qId] = {
                id: qId,
                name: audit.version.questionnaire.name,
                type: audit.version.questionnaire.type,
                scores: [],
                count: 0,
            };
        }
        acc[qId].scores.push(audit.totalScore || 0);
        acc[qId].count++;
        return acc;
    }, {} as Record<string, { id: string; name: string; type: string; scores: number[]; count: number }>);

    const questionnaires = Object.values(questionnaireStats).map(q => ({
        id: q.id,
        name: q.name,
        type: q.type,
        averageScore: q.scores.reduce((a, b) => a + b, 0) / q.count,
        auditCount: q.count,
    }));

    // Overall category averages (for radar chart)
    const overallCategoryStats = audits.reduce((acc, audit) => {
        const categoryScores = calculateCategoryScores({ answers: audit.answers });
        categoryScores.forEach(catScore => {
            if (!acc[catScore.category]) {
                acc[catScore.category] = { total: 0, count: 0 };
            }
            acc[catScore.category].total += catScore.score;
            acc[catScore.category].count += 1;
        });
        return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const categoryAverages = Object.entries(overallCategoryStats).map(([category, stats]) => ({
        category,
        score: Math.round((stats.total / stats.count) * 100 * 10) / 10,
    }));

    // Calculate previous period stats for trend comparison
    let previousPeriodScore: number | null = null;
    let scoreChange: number | null = null;

    if (filters?.startDate && filters?.endDate) {
        const periodLength = new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime();
        const previousStart = new Date(new Date(filters.startDate).getTime() - periodLength);
        const previousEnd = new Date(filters.startDate);

        const previousWhere = {
            ...where,
            auditDate: { gte: previousStart, lte: previousEnd },
        };

        const previousAudits = await prisma.audit.findMany({
            where: previousWhere,
            select: { totalScore: true },
        });

        if (previousAudits.length > 0) {
            previousPeriodScore = previousAudits.reduce((sum, a) => sum + (a.totalScore || 0), 0) / previousAudits.length;
            scoreChange = averageScore - previousPeriodScore;
        }
    }

    return {
        totalAudits,
        averageScore: Math.round(averageScore * 100) / 100,
        previousPeriodScore: previousPeriodScore ? Math.round(previousPeriodScore * 100) / 100 : null,
        scoreChange: scoreChange ? Math.round(scoreChange * 100) / 100 : null,
        timeline,
        distribution,
        managers,
        questionnaires,
        categoryAverages,
    };
}

export async function getManagerDetails(managerId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    questionnaireId?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'COMPANY') {
        throw new Error('Unauthorized');
    }

    const companyId = session.user.companyId!;

    // Проверяем, что менеджер принадлежит компании
    const manager = await prisma.manager.findFirst({
        where: {
            id: managerId,
            companyId,
        },
    });

    if (!manager) {
        throw new Error('Manager not found');
    }

    const where: any = {
        companyId,
        managerId,
        status: 'COMPLETED',
        isDeleted: false,
    };

    if (filters?.startDate) {
        where.auditDate = { ...where.auditDate, gte: filters.startDate };
    }

    if (filters?.endDate) {
        where.auditDate = { ...where.auditDate, lte: filters.endDate };
    }

    if (filters?.questionnaireId) {
        where.version = {
            questionnaireId: filters.questionnaireId,
        };
    }

    const audits = await prisma.audit.findMany({
        where,
        select: {
            id: true,
            totalScore: true,
            auditDate: true,
            version: {
                select: {
                    questionnaire: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                        },
                    },
                },
            },
        },
        orderBy: { auditDate: 'asc' },
    });

    const totalAudits = audits.length;
    const averageScore = totalAudits > 0
        ? audits.reduce((sum, audit) => sum + (audit.totalScore || 0), 0) / totalAudits
        : 0;

    // График динамики
    const monthlyData = audits.reduce((acc, audit) => {
        const month = format(new Date(audit.auditDate), 'yyyy-MM');
        if (!acc[month]) {
            acc[month] = { scores: [], count: 0 };
        }
        acc[month].scores.push(audit.totalScore || 0);
        acc[month].count++;
        return acc;
    }, {} as Record<string, { scores: number[]; count: number }>);

    const timeline = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        averageScore: data.scores.reduce((a, b) => a + b, 0) / data.count,
        count: data.count,
    }));

    // Статистика по анкетам
    const questionnaireStats = audits.reduce((acc, audit) => {
        const qId = audit.version.questionnaire.id;
        if (!acc[qId]) {
            acc[qId] = {
                id: qId,
                name: audit.version.questionnaire.name,
                type: audit.version.questionnaire.type,
                scores: [],
                count: 0,
            };
        }
        acc[qId].scores.push(audit.totalScore || 0);
        acc[qId].count++;
        return acc;
    }, {} as Record<string, { id: string; name: string; type: string; scores: number[]; count: number }>);

    const questionnaires = Object.values(questionnaireStats).map(q => ({
        id: q.id,
        name: q.name,
        type: q.type,
        averageScore: q.scores.reduce((a, b) => a + b, 0) / q.count,
        auditCount: q.count,
    }));

    return {
        manager,
        totalAudits,
        averageScore: Math.round(averageScore * 100) / 100,
        timeline,
        questionnaires,
    };
}

export async function getCompanyAudits(filters?: {
    startDate?: Date;
    endDate?: Date;
    managerId?: string;
    questionnaireId?: string;
    page?: number;
    pageSize?: number;
}) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'COMPANY') {
        throw new Error('Unauthorized');
    }

    const companyId = session.user.companyId!;
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;

    const where: any = {
        companyId,
        status: 'COMPLETED',
        isDeleted: false,
    };

    if (filters?.startDate) {
        where.auditDate = { ...where.auditDate, gte: filters.startDate };
    }

    if (filters?.endDate) {
        where.auditDate = { ...where.auditDate, lte: filters.endDate };
    }

    if (filters?.managerId) {
        where.managerId = filters.managerId;
    }

    if (filters?.questionnaireId) {
        where.version = {
            questionnaireId: filters.questionnaireId,
        };
    }

    const [audits, total] = await Promise.all([
        prisma.audit.findMany({
            where,
            select: {
                id: true,
                totalScore: true,
                auditDate: true,
                completedAt: true,
                manager: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                version: {
                    select: {
                        questionnaire: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                            },
                        },
                    },
                },
            },
            orderBy: { auditDate: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.audit.count({ where }),
    ]);

    return {
        audits,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

export async function getAuditReport(auditId: string) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'COMPANY') {
        throw new Error('Unauthorized');
    }

    const audit = await prisma.audit.findUnique({
        where: { id: auditId },
        include: {
            company: {
                select: {
                    id: true,
                    name: true,
                },
            },
            manager: {
                select: {
                    id: true,
                    name: true,
                },
            },
            analyst: {
                select: {
                    id: true,
                    name: true,
                },
            },
            version: {
                include: {
                    questionnaire: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                        },
                    },
                    questions: {
                        where: { isActive: true },
                        orderBy: { order: 'asc' },
                        include: {
                            subitems: {
                                where: { isActive: true },
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                },
            },
            answers: {
                include: {
                    question: {
                        select: {
                            id: true,
                            text: true,
                            category: true,
                            weight: true,
                        },
                    },
                    subitem: {
                        select: {
                            id: true,
                            text: true,
                            weight: true,
                        },
                    },
                },
            },
        },
    });

    if (!audit) {
        throw new Error('Audit not found');
    }

    // Проверка доступа
    if (audit.company.id !== session.user.companyId) {
        throw new Error('Forbidden');
    }

    return audit;
}
