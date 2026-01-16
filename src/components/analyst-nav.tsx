'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ClipboardList, LogOut, Building2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { getCachedCompanies, Company } from '@/lib/analyst-cache';

const navigation = [
  { name: 'Мои аудиты', href: '/analyst/audits', icon: ClipboardList },
];

export function AnalystNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isCompaniesOpen, setIsCompaniesOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await getCachedCompanies();
        setCompanies(data);
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCompanies();
  }, []);

  return (
    <div className="flex h-screen flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <h1 className="text-xl font-bold">Аналитик</h1>
          <p className="text-sm text-muted-foreground">{userName}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {/* Companies Section */}
        <div>
          <button
            onClick={() => setIsCompaniesOpen(!isCompaniesOpen)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5" />
              Компании
            </div>
            {isCompaniesOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {isCompaniesOpen && (
            <div className="mt-1 ml-4 space-y-1 pl-4 border-l">
              {isLoading ? (
                <div className="py-2 px-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Загрузка...
                </div>
              ) : companies.length === 0 ? (
                <div className="py-2 px-3 text-sm text-muted-foreground">Нет компаний</div>
              ) : (
                companies.map((company) => {
                  const isActive = pathname === `/analyst/companies/${company.id}`;
                  return (
                    <Link
                      key={company.id}
                      href={`/analyst/companies/${company.id}`}
                      className={cn(
                        'block truncate rounded-md px-3 py-2 text-sm transition-colors',
                         isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      title={company.name}
                    >
                      {company.name}
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Other Navigation Items */}
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
