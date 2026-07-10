import { FileCheck } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function BONA() {
  return (
    <PageContainer>
      <PageTitle icon={FileCheck} title="BONA" />
      <EmptyCard
        icon={FileCheck}
        title="BONA - Boletim de Ocorrência e Notificação de Acidente"
        description="Registro de boletins de ocorrência e notificações de acidentes. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
