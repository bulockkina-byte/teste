import { LayoutDashboard } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Dashboard() {
  return (
    <PageContainer>
      <PageTitle icon={LayoutDashboard} title="Dashboard" />
      <EmptyCard
        icon={LayoutDashboard}
        title="Dashboard"
        description="Visão geral do sistema com indicadores e métricas operacionais. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
