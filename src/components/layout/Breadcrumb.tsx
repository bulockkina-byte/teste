import { useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  const labels: Record<string, string> = {
    cadastro: 'Cadastro',
    bombeiros: 'Bombeiros',
    equipamentos: 'Equipamentos',
    extintores: 'Extintores',
    hidrantes: 'Hidrantes',
    relatorios: 'Relatórios',
    lro: 'LRO',
    bona: 'BONA',
    'ptr-ba': 'PTR-BA',
    exercicios: 'Exercícios',
    taf: 'TAF',
    'tp-epr': 'TP/EPR',
    'ordem-servico': 'Ordem de Serviço',
    trocas: 'Trocas',
    ocorrencias: 'Ocorrências',
    inspecoes: 'Inspeções Operacionais',
    viaturas: 'Viaturas CCI',
    epis: 'EPIs',
    checklists: 'Checklists',
    documentos: 'Documentos',
    escalas: 'Escalas',
    treinamentos: 'Treinamentos',
    certificacoes: 'Certificações',
    funcionarios: 'Funcionários',
    estatisticas: 'Estatísticas',
    configuracoes: 'Configurações',
    usuarios: 'Usuários',
    perfil: 'Meu Perfil',
  };

  return (
    <nav className="flex items-center gap-1.5 text-sm text-graphite-500 dark:text-graphite-400">
      <Home className="h-4 w-4" />
      {segments.length === 0 ? (
        <span className="font-medium text-graphite-700 dark:text-graphite-200">
          Dashboard
        </span>
      ) : (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          {segments.map((segment, index) => {
            const label = labels[segment] || segment;
            const isLast = index === segments.length - 1;
            return (
              <span key={segment} className="flex items-center gap-1.5">
                {isLast ? (
                  <span className="font-medium text-graphite-700 dark:text-graphite-200">
                    {label}
                  </span>
                ) : (
                  <span className="text-graphite-500 dark:text-graphite-400">
                    {label}
                  </span>
                )}
                {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
              </span>
            );
          })}
        </>
      )}
    </nav>
  );
}
