import { FileText } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Documentos() {
  return (
    <PageContainer>
      <PageTitle icon={FileText} title="Documentos" />
      <EmptyCard
        icon={FileText}
        title="Documentos"
        description="Repositório de documentos e normativas. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}
