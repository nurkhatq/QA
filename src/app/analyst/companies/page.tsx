import { Building2, ArrowLeft } from 'lucide-react';

export default function CompaniesIndexPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-muted-foreground p-6 text-center animate-in fade-in duration-500">
      <div className="h-24 w-24 rounded-full bg-muted/30 flex items-center justify-center mb-6 ring-8 ring-muted/10">
        <Building2 className="h-10 w-10 opacity-40" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Выберите компанию</h2>
      <p className="max-w-md text-lg">
        В меню слева выберите компанию, чтобы увидеть доступные анкеты и начать проверку.
      </p>
      
      <div className="mt-12 hidden md:flex items-center gap-2 text-sm opacity-50">
          <ArrowLeft className="h-4 w-4" />
          <span>Меню компаний слева</span>
      </div>
    </div>
  );
}
