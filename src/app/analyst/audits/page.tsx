import { getAudits } from '@/app/actions/audits';
import { AnalystDashboard } from '@/components/analyst-dashboard';

export default async function AuditsPage() {
  const audits = await getAudits();

  return (
    <div className="h-[calc(100vh-4rem)] p-6">
      <AnalystDashboard initialAudits={audits} />
    </div>
  );
}
