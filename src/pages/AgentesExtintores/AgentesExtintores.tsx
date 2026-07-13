import { Flame } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyCard } from '../../components/ui/EmptyCard';

export function AgentesExtintores() {
  return (
    <PageContainer>
      <PageTitle icon={Flame} title="Agentes Extintores" />
      <EmptyCard
        icon={Flame}
        title="Agentes Extintores"
        description="Controle de agentes extintores e recargas. Este módulo será desenvolvido em breve."
      />
    </PageContainer>
  );
}

export default AgentesExtintores;
