import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { GlobalFilters } from '@/components/dashboard/GlobalFilters';

export default function ExecutiveDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="sticky top-0 z-30">
        {/* Sub-navegação entre dashboards */}
        <DashboardNav />
        {/* Filtros globais */}
        <GlobalFilters showUnit />
      </div>
      {/* Conteúdo da página */}
      <div className="flex-1 overflow-auto bg-gray-50/50">
        {children}
      </div>
    </div>
  );
}
