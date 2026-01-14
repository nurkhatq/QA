import { AuditAnswer } from '@prisma/client';

export interface ScoreCalculationData {
  answers: (AuditAnswer & {
    question?: {
      weight: number;
      isActive: boolean;
      hasSubitems: boolean;
    } | null;
    subitem?: {
      weight: number;
      isActive: boolean;
    } | null;
  })[];
}

export function calculateAuditScore(data: ScoreCalculationData): number {
  const { answers } = data;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const answer of answers) {
    const question = answer.question;
    const subitem = answer.subitem;

    if (!question?.isActive) continue;

    // Если вопрос имеет подпункты, учитываем только активные подпункты
    if (question.hasSubitems && subitem) {
      if (!subitem.isActive) continue;

      const score = answer.score ?? 0;
      const weight = question.weight * subitem.weight;

      totalWeightedScore += score * weight;
      totalWeight += weight;
    }
    // Если вопрос без подпунктов
    else if (!question.hasSubitems && !subitem) {
      const score = answer.score ?? 0;
      const weight = question.weight;

      totalWeightedScore += score * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;

  return totalWeightedScore / totalWeight;
}

export interface CategoryScore {
  category: string;
  score: number;
  weight: number;
  count: number;
}

export function calculateCategoryScores(
  data: ScoreCalculationData
): CategoryScore[] {
  const { answers } = data;

  const categoryMap = new Map<
    string,
    { totalWeightedScore: number; totalWeight: number; count: number }
  >();

  for (const answer of answers) {
    const question = answer.question;
    const subitem = answer.subitem;

    if (!question?.isActive) continue;

    const category = question.category || 'Без категории';

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        totalWeightedScore: 0,
        totalWeight: 0,
        count: 0,
      });
    }

    const categoryData = categoryMap.get(category)!;

    if (question.hasSubitems && subitem) {
      if (!subitem.isActive) continue;

      const score = answer.score ?? 0;
      const weight = question.weight * subitem.weight;

      categoryData.totalWeightedScore += score * weight;
      categoryData.totalWeight += weight;
      categoryData.count += 1;
    } else if (!question.hasSubitems && !subitem) {
      const score = answer.score ?? 0;
      const weight = question.weight;

      categoryData.totalWeightedScore += score * weight;
      categoryData.totalWeight += weight;
      categoryData.count += 1;
    }
  }

  const categoryScores: CategoryScore[] = [];

  for (const [category, data] of categoryMap.entries()) {
    if (data.totalWeight === 0) continue;

    categoryScores.push({
      category,
      score: data.totalWeightedScore / data.totalWeight,
      weight: data.totalWeight,
      count: data.count,
    });
  }

  return categoryScores;
}
