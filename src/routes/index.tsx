import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Dashboard } from '../pages/Dashboard/Dashboard';
import { Ocorrencias } from '../pages/Ocorrencias/Ocorrencias';
import { Inspecoes } from '../pages/Inspecoes/Inspecoes';
import { Viaturas } from '../pages/Viaturas/Viaturas';
import { EPIs } from '../pages/EPIs/EPIs';
import { Checklists } from '../pages/Checklists/Checklists';
import { Documentos } from '../pages/Documentos/Documentos';
import { Escalas } from '../pages/Escalas/Escalas';
import { Treinamentos } from '../pages/Treinamentos/Treinamentos';
import { Certificacoes } from '../pages/Certificacoes/Certificacoes';
import { Funcionarios } from '../pages/Funcionarios/Funcionarios';
import { Estatisticas } from '../pages/Estatisticas/Estatisticas';
import { LRO } from '../pages/Relatorios/LRO';
import { BONA } from '../pages/Relatorios/BONA';
import { PTRBA } from '../pages/Relatorios/PTRBA';
import { Exercicios } from '../pages/Relatorios/Exercicios';
import { TAF } from '../pages/Relatorios/TAF';
import { TPEPR } from '../pages/Relatorios/TPEPR';
import { OrdemServico } from '../pages/Relatorios/OrdemServico';
import { Trocas } from '../pages/Relatorios/Trocas';
import { Configuracoes } from '../pages/Configuracoes/Configuracoes';
import { Perfil } from '../pages/Perfil/Perfil';
import { Login } from '../pages/Login/Login';
import { AuthGuard } from '../components/layout/AuthGuard';

import { Bombeiros } from '../pages/Bombeiros/Bombeiros';
import { Usuarios } from '../pages/Usuarios/Usuarios';
import { Equipamentos } from '../pages/Equipamentos/Equipamentos';
import { AgentesExtintores } from '../pages/AgentesExtintores/AgentesExtintores';
import { Hidrantes } from '../pages/Hidrantes/Hidrantes';
import { APOCs } from '../pages/APOC/APOCs';
import { LRODiario } from '../pages/RegistrosDiarios/LRODiario';
import { PTRBADiario } from '../pages/RegistrosDiarios/PTRBADiario';
import { LROOcorrencias } from '../pages/RegistrosDiarios/LROOcorrencias';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
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
      { path: 'cadastro/bombeiros', element: <Bombeiros /> },
      { path: 'cadastro/apoc', element: <APOCs /> },
      { path: 'cadastro/equipamentos', element: <Equipamentos /> },
      { path: 'cadastro/extintores', element: <AgentesExtintores /> },
      { path: 'cadastro/hidrantes', element: <Hidrantes /> },
      { path: 'cadastro/viaturas', element: <Viaturas /> },
      { path: 'ocorrencias', element: <Ocorrencias /> },
      { path: 'inspecoes', element: <Inspecoes /> },
      { path: 'viaturas', element: <Viaturas /> },
      { path: 'epis', element: <EPIs /> },
      { path: 'checklists', element: <Checklists /> },
      { path: 'documentos', element: <Documentos /> },
      { path: 'escalas', element: <Escalas /> },
      { path: 'treinamentos', element: <Treinamentos /> },
      { path: 'certificacoes', element: <Certificacoes /> },
      { path: 'funcionarios', element: <Funcionarios /> },
      { path: 'estatisticas', element: <Estatisticas /> },
      { path: 'registros-diarios/lro', element: <LRODiario /> },
      { path: 'registros-diarios/ptr-ba', element: <PTRBADiario /> },
      { path: 'registros-diarios/lro-ocorrencias', element: <LROOcorrencias /> },
      { path: 'relatorios/lro', element: <LRO /> },
      { path: 'relatorios/bona', element: <BONA /> },
      { path: 'relatorios/ptr-ba', element: <PTRBA /> },
      { path: 'relatorios/exercicios', element: <Exercicios /> },
      { path: 'relatorios/exercicios/taf', element: <TAF /> },
      { path: 'relatorios/exercicios/tp-epr', element: <TPEPR /> },
      { path: 'relatorios/ordem-servico', element: <OrdemServico /> },
      { path: 'relatorios/trocas', element: <Trocas /> },
      { path: 'configuracoes', element: <Configuracoes /> },
      { path: 'usuarios', element: <Usuarios /> },
      { path: 'perfil', element: <Perfil /> },
      { path: 'sair', element: <Navigate to="/login" replace /> },
    ],
  },
]);
