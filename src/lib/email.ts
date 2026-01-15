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
}: {
    to: string;
    companyName: string;
    auditName: string;
    score: number;
    auditId: string;
}) {
    const reportUrl = `${process.env.NEXTAUTH_URL}/company/reports/${auditId}`;

    const mailOptions = {
        from: process.env.SMTP_FROM || '"QA System" <no-reply@example.com>',
        to,
        subject: `Готов отчет аудита: ${auditName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Отчет аудита готов</h2>
        <p>Добрый день!</p>
        <p>Проверка качества для компании <strong>${companyName}</strong> завершена.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px;">Анкета: <strong>${auditName}</strong></p>
          <p style="margin: 10px 0 0; font-size: 24px; color: ${score >= 0.8 ? 'green' : score >= 0.5 ? '#d97706' : 'red'};">
            Итоговый балл: <strong>${(score * 100).toFixed(0)}%</strong>
          </p>
        </div>

        <p>Вы можете ознакомиться с детальным отчетом по ссылке:</p>
        <p>
          <a href="${reportUrl}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Перейти к отчету
          </a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #666; font-size: 12px;">Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
      </div>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error to prevent blocking audit completion
    }
}
