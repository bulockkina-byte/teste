import { UserCircle } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Perfil() {
  return (
    <PageContainer>
      <PageTitle icon={UserCircle} title="Meu Perfil" />
      <EmptyCard
        icon={UserCircle}
        title="Meu Perfil"
        description="Visualização e edição do perfil do usuário. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
