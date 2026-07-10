import { FileSpreadsheet } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function LRO() {
  return (
    <PageContainer>
      <PageTitle icon={FileSpreadsheet} title="LRO" />
      <EmptyCard
        icon={FileSpreadsheet}
        title="LRO - Lista de Ronda Operacional"
        description="Registro e acompanhamento das rondas operacionais. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
