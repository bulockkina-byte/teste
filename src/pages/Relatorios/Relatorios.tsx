import { FileBarChart } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Relatorios() {
  return (
    <PageContainer>
      <PageTitle icon={FileBarChart} title="Relatórios" />
      <EmptyCard
        icon={FileBarChart}
        title="Relatórios"
        description="Geração de relatórios gerenciais. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
