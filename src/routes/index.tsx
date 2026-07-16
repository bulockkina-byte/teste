import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Dashboard } from '../pages/Dashboard/Dashboard';
import { Login } from '../pages/Login/Login';
import { ConviteRegister } from '../pages/Login/ConviteRegister';
import { AguardandoFuncao } from '../pages/AguardandoFuncao/AguardandoFuncao';
import { AuthGuard } from '../components/layout/AuthGuard';
import { Loading } from '../components/ui/Loading';

function lazyPage(factory: () => Promise<{ default: React.ComponentType }>) {
  const Lazy = lazy(factory);
  return (
    <Suspense fallback={<Loading />}>
      <Lazy />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/cadastro/convite/:codigo',
    element: <ConviteRegister />,
  },
  {
    path: '/aguardando-funcao',
    element: <AguardandoFuncao />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'cadastro/bombeiros', element: lazyPage(() => import('../pages/Bombeiros/Bombeiros')) },
      { path: 'cadastro/apoc', element: lazyPage(() => import('../pages/APOC/APOCs')) },
      { path: 'cadastro/equipamentos', element: lazyPage(() => import('../pages/Equipamentos/Equipamentos')) },
      { path: 'cadastro/extintores', element: lazyPage(() => import('../pages/AgentesExtintores/AgentesExtintores')) },
      { path: 'cadastro/hidrantes', element: lazyPage(() => import('../pages/Hidrantes/Hidrantes')) },
      { path: 'cadastro/viaturas', element: lazyPage(() => import('../pages/Viaturas/Viaturas')) },
      { path: 'cadastro/ferias', element: lazyPage(() => import('../pages/Ferias/Ferias')) },
      { path: 'cadastro/documentos', element: lazyPage(() => import('../pages/Documentos/Documentos')) },
      { path: 'ocorrencias', element: lazyPage(() => import('../pages/Ocorrencias/Ocorrencias')) },
      { path: 'inspecoes', element: lazyPage(() => import('../pages/Inspecoes/Inspecoes')) },
      { path: 'inspecoes/check', element: lazyPage(() => import('../pages/Inspecoes/InspecaoCheck')) },
      { path: 'viaturas', element: lazyPage(() => import('../pages/Viaturas/Viaturas')) },
      { path: 'epis', element: lazyPage(() => import('../pages/EPIs/EPIs')) },
      { path: 'checklists', element: lazyPage(() => import('../pages/Checklists/Checklists')) },
      { path: 'documentos', element: lazyPage(() => import('../pages/Documentos/Documentos')) },
      { path: 'documentos/trocas', element: lazyPage(() => import('../pages/Relatorios/Trocas')) },
      { path: 'escalas', element: lazyPage(() => import('../pages/Escalas/Escalas')) },
      { path: 'treinamentos', element: lazyPage(() => import('../pages/Treinamentos/Treinamentos')) },
      { path: 'treinamentos/tp-epr', element: lazyPage(() => import('../pages/Relatorios/TPEPR')) },
      { path: 'treinamentos/taf', element: lazyPage(() => import('../pages/Relatorios/TAF')) },
      { path: 'certificacoes', element: lazyPage(() => import('../pages/Certificacoes/Certificacoes')) },
      { path: 'funcionarios', element: lazyPage(() => import('../pages/Funcionarios/Funcionarios')) },
      { path: 'funcionarios/substituicoes', element: lazyPage(() => import('../pages/Funcionarios/Substituicoes')) },
      { path: 'estatisticas', element: lazyPage(() => import('../pages/Estatisticas/Estatisticas')) },
      { path: 'registros-diarios/lro', element: lazyPage(() => import('../pages/RegistrosDiarios/LRODiario')) },
      { path: 'registros-diarios/ptr-ba', element: lazyPage(() => import('../pages/RegistrosDiarios/PTRBADiario')) },
      { path: 'registros-diarios/lro-ocorrencias', element: lazyPage(() => import('../pages/RegistrosDiarios/LROOcorrencias')) },
      { path: 'relatorios/lro', element: lazyPage(() => import('../pages/Relatorios/LRO')) },
      { path: 'relatorios/gerar-lro', element: <Navigate to="/registros-diarios/gerar-lro" replace /> },
      { path: 'registros-diarios/gerar-lro', element: lazyPage(() => import('../pages/GerarLRO/GerarLRO')) },
      { path: 'relatorios/bona', element: lazyPage(() => import('../pages/Relatorios/BONA')) },
      { path: 'relatorios/ptr-ba', element: lazyPage(() => import('../pages/Relatorios/PTRBA')) },
      { path: 'relatorios/exercicios', element: lazyPage(() => import('../pages/Relatorios/Exercicios')) },
      { path: 'relatorios/exercicios/taf', element: lazyPage(() => import('../pages/Relatorios/TAF')) },
      { path: 'relatorios/exercicios/tp-epr', element: lazyPage(() => import('../pages/Relatorios/TPEPR')) },
      { path: 'relatorios/ordem-servico', element: lazyPage(() => import('../pages/Relatorios/OrdemServico')) },
      { path: 'relatorios/trocas', element: lazyPage(() => import('../pages/Relatorios/Trocas')) },
      { path: 'arquivo/:tipo?', element: lazyPage(() => import('../pages/Arquivo/Arquivo')) },
      { path: 'configuracoes', element: lazyPage(() => import('../pages/Configuracoes/Configuracoes')) },
      { path: 'usuarios', element: lazyPage(() => import('../pages/Usuarios/Usuarios')) },
      { path: 'perfil', element: lazyPage(() => import('../pages/Perfil/Perfil')) },
      { path: 'sair', element: <Navigate to="/login" replace /> },
    ],
  },
]);
