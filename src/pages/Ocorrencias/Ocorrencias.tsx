import { AlertTriangle } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Ocorrencias() {
  return (
    <PageContainer>
      <PageTitle icon={AlertTriangle} title="Ocorrências" />
      <EmptyCard
        icon={AlertTriangle}
        title="Ocorrências"
        description="Registro e acompanhamento de ocorrências operacionais. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
