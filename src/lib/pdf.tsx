import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Стили для PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  infoSection: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    width: 120,
    fontWeight: 'bold',
  },
  infoValue: {
    flex: 1,
  },
  scoreSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#e8f5e9',
    borderRadius: 5,
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  progressBar: {
    height: 20,
    backgroundColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  categorySection: {
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  categoryScore: {
    fontSize: 11,
    marginBottom: 5,
    color: '#666',
  },
  questionSection: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fafafa',
    borderRadius: 5,
  },
  questionCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976d2',
  },
  question: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  questionText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  questionScore: {
    fontSize: 10,
    color: '#666',
    marginBottom: 5,
  },
  comment: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#555',
    marginTop: 5,
    paddingLeft: 10,
  },
  subitem: {
    marginLeft: 15,
    marginTop: 5,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#ccc',
  },
  subitemText: {
    fontSize: 10,
    marginBottom: 3,
  },
  finalComments: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff3e0',
    borderRadius: 5,
  },
  finalCommentsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  finalCommentsText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 9,
    color: '#999',
  },
});

type PDFReportProps = {
  audit: {
    auditDate: Date;
    analyst: { name: string };
    company: { name: string };
    version: {
      questionnaire: { name: string };
      questions: Array<{
        id: string;
        text: string;
        category: string | null;
        hasSubitems: boolean;
        subitems?: Array<{
          id: string;
          text: string;
        }>;
      }>;
    };
    positiveComment?: string | null;
    negativeComment?: string | null;
  };
  totalScore: number;
  categoryScores: Array<{ category: string; score: number }>;
  answersMap: Map<string, { score: number; comment?: string }>;
};

export function AuditPDFDocument({ audit, totalScore, categoryScores, answersMap }: PDFReportProps) {
  // Группируем вопросы по категориям
  const groupedQuestions = audit.version.questions.reduce((acc, question) => {
    const category = question.category || 'Без категории';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(question);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.title}>Отчёт аудита качества</Text>
          <Text style={styles.subtitle}>{audit.version.questionnaire.name}</Text>
        </View>

        {/* Информация об аудите */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Компания:</Text>
            <Text style={styles.infoValue}>{audit.company.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Дата проведения:</Text>
            <Text style={styles.infoValue}>
              {new Date(audit.auditDate).toLocaleDateString('ru-RU')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Аналитик:</Text>
            <Text style={styles.infoValue}>{audit.analyst.name}</Text>
          </View>
        </View>

        {/* Итоговая оценка */}
        <View style={styles.scoreSection}>
          <Text style={styles.scoreTitle}>Итоговая оценка</Text>
          <Text style={styles.scoreValue}>{(totalScore * 100).toFixed(0)}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${totalScore * 100}%` }]} />
          </View>
          <Text style={{ fontSize: 10, color: '#666' }}>
            Средний балл: {totalScore.toFixed(2)} из 1.0
          </Text>
        </View>

        {/* Оценки по категориям */}
        {categoryScores.length > 0 && (
          <View style={styles.categorySection}>
            <Text style={styles.scoreTitle}>Оценка по категориям</Text>
            {categoryScores.map((cat) => (
              <View key={cat.category} style={{ marginBottom: 8 }}>
                <Text style={styles.categoryTitle}>{cat.category}</Text>
                <Text style={styles.categoryScore}>
                  {(cat.score * 100).toFixed(0)}% ({cat.score.toFixed(2)})
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${cat.score * 100}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}
      </Page>

      {/* Детализация по вопросам */}
      <Page size="A4" style={styles.page}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
          Детальная оценка
        </Text>

        {Object.entries(groupedQuestions).map(([category, questions]) => (
          <View key={category} style={styles.questionSection}>
            <Text style={styles.questionCategory}>{category}</Text>

            {questions.map((question: any) => {
              const answer = answersMap.get(question.id);
              const score = answer?.score;

              return (
                <View key={question.id} style={styles.question}>
                  <Text style={styles.questionText}>{question.text}</Text>
                  {score !== null && score !== undefined && (
                    <Text style={styles.questionScore}>Оценка: {score}</Text>
                  )}
                  {answer?.comment && (
                    <Text style={styles.comment}>Комментарий: {answer.comment}</Text>
                  )}

                  {/* Подпункты */}
                  {question.hasSubitems && question.subitems && (
                    <View style={styles.subitem}>
                      {question.subitems.map((subitem: any) => {
                        const subAnswer = answersMap.get(subitem.id);
                        return (
                          <View key={subitem.id}>
                            <Text style={styles.subitemText}>
                              • {subitem.text} {subAnswer?.score !== undefined ? `- ${subAnswer.score}` : ''}
                            </Text>
                            {subAnswer?.comment && (
                              <Text style={[styles.comment, { marginLeft: 10 }]}>
                                {subAnswer.comment}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </Page>

      {/* Итоговые комментарии */}
      {(audit.positiveComment || audit.negativeComment) && (
        <Page size="A4" style={styles.page}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
            Итоговые комментарии
          </Text>

          {audit.positiveComment && (
            <View style={[styles.finalComments, { backgroundColor: '#e8f5e9' }]}>
              <Text style={styles.finalCommentsTitle}>Что было хорошо?</Text>
              <Text style={styles.finalCommentsText}>{audit.positiveComment}</Text>
            </View>
          )}

          {audit.negativeComment && (
            <View style={[styles.finalComments, { backgroundColor: '#ffebee', marginTop: 15 }]}>
              <Text style={styles.finalCommentsTitle}>Плохо, над чем работать?</Text>
              <Text style={styles.finalCommentsText}>{audit.negativeComment}</Text>
            </View>
          )}
        </Page>
      )}
    </Document>
  );
}
