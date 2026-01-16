import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendAuditCompletionEmail({
  to,
  companyName,
  auditName,
  score,
  auditId,
  managerName,
  auditDate,
  categories,
  positiveComment,
  negativeComment,
  items,
}: {
  to: string;
  companyName: string;
  auditName: string;
  score: number;
  auditId: string;
  managerName: string;
  auditDate: string;
  categories: Array<{ name: string; score: number }>;
  positiveComment?: string;
  negativeComment?: string;
  items?: Array<{ text: string; score: number; maxScore: number; comment?: string | null }>;
}) {
  const reportUrl = `${process.env.NEXTAUTH_URL}/company/reports/${auditId}`;
  const scorePercent = (score * 100).toFixed(1); // 87.5

  // Определяем цвет для общего балла
  const scoreColor = score >= 0.8 ? '#16a34a' : score >= 0.5 ? '#d97706' : '#dc2626';

  const mailOptions = {
    from: process.env.SMTP_FROM || '"QA System" <no-reply@example.com>',
    to,
    subject: `Отчет аудита: ${companyName} - ${managerName} (${scorePercent}%)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="margin: 0; color: #111827;">Отчет о контроле качества</h2>
          <p style="color: #6b7280; margin: 5px 0 0;">${auditDate}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p style="font-size: 16px;">Добрый день, <strong>${managerName}</strong>!</p>
          <p style="font-size: 14px; color: #4b5563;">Направляем вам результаты аудита по анкете "${auditName}".</p>
        </div>

        <div style="background-color: #f9fafb; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding-bottom: 8px; color: #6b7280; font-size: 14px;">Компания</td>
              <td style="padding-bottom: 8px; text-align: right; font-weight: 600;">${companyName}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 8px; color: #6b7280; font-size: 14px;">Менеджер</td>
              <td style="padding-bottom: 8px; text-align: right; font-weight: 600;">${managerName}</td>
            </tr>
            <tr>
              <td style="padding-top: 16px; font-size: 18px; font-weight: bold;">Итоговый балл</td>
              <td style="padding-top: 16px; text-align: right; font-size: 32px; font-weight: bold; color: ${scoreColor};">
                ${scorePercent}%
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px;">Оценка по категориям</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${categories.map(cat => `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">${cat.name}</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 600;">
                  ${(cat.score * 100).toFixed(0)}%
                </td>
              </tr>
            `).join('')}
          </table>
        </div>

        ${items && items.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px;">Детализация по вопросам</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 10px; text-align: left; border-radius: 6px 0 0 6px;">Вопрос</th>
                  <th style="padding: 10px; text-align: center;">Балл</th>
                  <th style="padding: 10px; text-align: left; border-radius: 0 6px 6px 0;">Комментарий</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 8px; vertical-align: top;">${item.text}</td>
                    <td style="padding: 12px 8px; text-align: center; white-space: nowrap; vertical-align: top;">
                      <span style="font-weight: 600; color: ${item.score === item.maxScore ? '#16a34a' : item.score === 0 ? '#dc2626' : '#d97706'}">
                        ${item.score} / ${item.maxScore}
                      </span>
                    </td>
                    <td style="padding: 12px 8px; color: #4b5563; vertical-align: top;">
                      ${item.comment || '-'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${(positiveComment || negativeComment) ? `
          <div style="margin-bottom: 30px;">
            <h3 style="border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px;">Общие комментарии</h3>
            
            ${positiveComment ? `
              <div style="margin-bottom: 20px;">
                <h4 style="color: #16a34a; margin: 0 0 8px;">Что было хорошо:</h4>
                <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; color: #166534;">
                  ${positiveComment.replace(/\n/g, '<br/>')}
                </div>
              </div>
            ` : ''}

            ${negativeComment ? `
              <div>
                <h4 style="color: #dc2626; margin: 0 0 8px;">Зоны роста:</h4>
                <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; color: #991b1b;">
                  ${negativeComment.replace(/\n/g, '<br/>')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 40px; color: #9ca3af; font-size: 12px;">
          <p>Это автоматическое уведомление от системы контроля качества.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
