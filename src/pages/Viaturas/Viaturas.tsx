import { Truck } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Viaturas() {
  return (
    <PageContainer>
      <PageTitle icon={Truck} title="Viaturas CCI" />
      <EmptyCard
        icon={Truck}
        title="Viaturas CCI"
        description="Controle e monitoramento de viaturas do CCI. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
