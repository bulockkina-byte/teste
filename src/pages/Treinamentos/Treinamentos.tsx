import { GraduationCap } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Treinamentos() {
  return (
    <PageContainer>
      <PageTitle icon={GraduationCap} title="Treinamentos" />
      <EmptyCard
        icon={GraduationCap}
        title="Treinamentos"
        description="Controle de treinamentos e capacitações. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
