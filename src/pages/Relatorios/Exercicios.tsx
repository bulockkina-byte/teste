import { Activity } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function Exercicios() {
  return (
    <PageContainer>
      <PageTitle icon={Activity} title="Exercícios" />
      <EmptyCard
        icon={Activity}
        title="Exercícios - TAF / TPR / EPR"
        description="Registro de Teste de Aptidão Física (TAF), Teste de Progressão (TPR) e Exame de Progressão (EPR). Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}

export default Exercicios;
