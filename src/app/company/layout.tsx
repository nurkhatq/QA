import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CompanyNav } from '@/components/company-nav';
import { getCompany } from '@/app/actions/companies';

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'COMPANY') {
    redirect('/');
  }

  if (!session.user.companyId) {
    return <div>Компания не найдена</div>;
  }

  const company = await getCompany(session.user.companyId);

  if (!company) {
    return <div>Компания не найдена</div>;
  }

  return (
    <div className="flex h-screen">
      <div className="w-64">
        <CompanyNav companyName={company.name} />
      </div>
      <main className="flex-1 overflow-y-auto bg-background p-8">{children}</main>
    </div>
  );
}
