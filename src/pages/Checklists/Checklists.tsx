import { ClipboardCheck } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Checklists() {
  return (
    <PageContainer>
      <PageTitle icon={ClipboardCheck} title="Checklists" />
      <EmptyCard
        icon={ClipboardCheck}
        title="Checklists"
        description="Criação e aplicação de checklists operacionais. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}

export default Checklists;
