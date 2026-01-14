import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Перенаправление в зависимости от роли
  if (session.user.role === 'ADMIN') {
    redirect('/admin/companies');
  } else if (session.user.role === 'ANALYST') {
    redirect('/analyst/audits');
  } else if (session.user.role === 'COMPANY') {
    redirect('/company/reports');
  }

  redirect('/login');
}
