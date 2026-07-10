import { Settings } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Configuracoes() {
  return (
    <PageContainer>
      <PageTitle icon={Settings} title="Configurações" />
      <EmptyCard
        icon={Settings}
        title="Configurações"
        description="Configurações do sistema. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
