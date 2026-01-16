import { getAudits } from '@/app/actions/audits';
import { AnalystAuditList } from '@/components/analyst-audit-list';

export default async function AuditsPage() {
  const audits = await getAudits();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Мои аудиты</h1>
          <p className="text-muted-foreground">История проверок и черновики</p>
        </div>
      </div>

      <AnalystAuditList initialAudits={audits} />
    </div>
  );
}
