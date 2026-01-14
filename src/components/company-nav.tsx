'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BarChart3, Users, FileBarChart, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Дашборд', href: '/company/dashboard', icon: BarChart3 },
  { name: 'Менеджеры', href: '/company/managers', icon: Users },
  { name: 'Отчёты', href: '/company/reports', icon: FileBarChart },
];

export function CompanyNav({ companyName }: { companyName: string }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <h1 className="text-xl font-bold">Компания</h1>
          <p className="text-sm text-muted-foreground">{companyName}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </Button>
      </div>
    </div>
  );
}
