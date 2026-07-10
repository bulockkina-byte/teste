import { Droplets } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Hidrantes() {
  return (
    <PageContainer>
      <PageTitle icon={Droplets} title="Hidrantes" />
      <EmptyCard
        icon={Droplets}
        title="Hidrantes"
        description="Gestão de hidrantes e pontos de água. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
