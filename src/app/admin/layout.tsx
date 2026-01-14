import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AdminNav } from '@/components/admin-nav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="flex h-screen">
      <div className="w-64">
        <AdminNav />
      </div>
      <main className="flex-1 overflow-y-auto bg-background p-8">{children}</main>
    </div>
  );
}
