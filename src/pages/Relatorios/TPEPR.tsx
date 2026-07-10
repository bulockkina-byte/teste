import { ScrollText } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function TPEPR() {
  return (
    <PageContainer>
      <PageTitle icon={ScrollText} title="TP/EPR" />
      <EmptyCard
        icon={ScrollText}
        title="TP/EPR - Teste de Progressão / Exame de Progressão"
        description="Registro e acompanhamento dos Testes de Progressão e Exames de Progressão. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
