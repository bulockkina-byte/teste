import { Target } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function TAF() {
  return (
    <PageContainer>
      <PageTitle icon={Target} title="TAF" />
      <EmptyCard
        icon={Target}
        title="TAF - Teste de Aptidão Física"
        description="Registro e acompanhamento dos Testes de Aptidão Física. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}

export default TAF;
