import { AlertCircle } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function LROOcorrencias() {
  return (
    <PageContainer>
      <PageTitle icon={AlertCircle} title="LRO/Ocorrências" />
      <EmptyCard
        icon={AlertCircle}
        title="LRO/Ocorrências"
        description="Registro de ocorrências durante o plantão. As ocorrências preenchidas aqui serão automaticamente incluídas no LRO. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
