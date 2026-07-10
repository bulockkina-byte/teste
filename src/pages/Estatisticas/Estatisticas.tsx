import { BarChart3 } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Estatisticas() {
  return (
    <PageContainer>
      <PageTitle icon={BarChart3} title="Estatísticas" />
      <EmptyCard
        icon={BarChart3}
        title="Estatísticas"
        description="Análise de dados e estatísticas operacionais. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
