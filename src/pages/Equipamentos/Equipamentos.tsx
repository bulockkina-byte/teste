import { Wrench } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Equipamentos() {
  return (
    <PageContainer>
      <PageTitle icon={Wrench} title="Equipamentos" />
      <EmptyCard
        icon={Wrench}
        title="Equipamentos"
        description="Cadastro e manutenção de equipamentos operacionais. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}

export default Equipamentos;
