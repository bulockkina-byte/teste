import { HardHat } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function EPIs() {
  return (
    <PageContainer>
      <PageTitle icon={HardHat} title="EPIs" />
      <EmptyCard
        icon={HardHat}
        title="EPIs"
        description="Controle de Equipamentos de Proteção Individual. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
