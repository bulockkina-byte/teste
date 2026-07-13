import { FileText } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function PTRBA() {
  return (
    <PageContainer>
      <PageTitle icon={FileText} title="PTR-BA" />
      <EmptyCard
        icon={FileText}
        title="PTR-BA - Plano de Trabalho de Ronda"
        description="Registro de planos de trabalho de ronda dos bombeiros de aeródromo. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}

export default PTRBA;
