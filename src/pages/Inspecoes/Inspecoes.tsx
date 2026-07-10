import { ShieldCheck } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Inspecoes() {
  return (
    <PageContainer>
      <PageTitle icon={ShieldCheck} title="Inspeções Operacionais" />
      <EmptyCard
        icon={ShieldCheck}
        title="Inspeções Operacionais"
        description="Gestão de inspeções de segurança e conformidade. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
