import { Award } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Certificacoes() {
  return (
    <PageContainer>
      <PageTitle icon={Award} title="Certificações" />
      <EmptyCard
        icon={Award}
        title="Certificações"
        description="Gestão de certificações e licenças. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
