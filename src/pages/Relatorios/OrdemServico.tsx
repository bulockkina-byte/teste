import { ClipboardList } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function OrdemServico() {
  return (
    <PageContainer>
      <PageTitle icon={ClipboardList} title="Ordem de Serviço" />
      <EmptyCard
        icon={ClipboardList}
        title="Ordem de Serviço"
        description="Controle de ordens de serviço operacionais. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
