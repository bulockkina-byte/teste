import { RefreshCw } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Trocas() {
  return (
    <PageContainer>
      <PageTitle icon={RefreshCw} title="Trocas" />
      <EmptyCard
        icon={RefreshCw}
        title="Trocas"
        description="Registro de trocas de plantão e equipamentos. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
