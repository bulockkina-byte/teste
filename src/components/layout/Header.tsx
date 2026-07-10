import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  MessageSquare,
  Sun,
  Moon,
  ChevronDown,
  Settings,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumb } from './Breadcrumb';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const pageTitle = getPageTitle(pathname);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-graphite-200 bg-white/80 px-6 backdrop-blur-md dark:border-graphite-800 dark:bg-graphite-900/80">
      <div className="flex flex-col">
        <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
          {pageTitle}
        </h2>
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            placeholder="Pesquisar..."
            className="w-64 rounded-lg border border-graphite-200 bg-graphite-50 py-2 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all focus:border-aviation-500 focus:ring-1 focus:ring-aviation-500 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100 dark:placeholder-graphite-500"
          />
        </div>

        <button className="rounded-lg p-2 text-graphite-500 transition-colors hover:bg-graphite-100 dark:text-graphite-400 dark:hover:bg-graphite-800">
          <Bell className="h-5 w-5" />
        </button>

        <button className="rounded-lg p-2 text-graphite-500 transition-colors hover:bg-graphite-100 dark:text-graphite-400 dark:hover:bg-graphite-800">
          <MessageSquare className="h-5 w-5" />
        </button>

        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-graphite-500 transition-colors hover:bg-graphite-100 dark:text-graphite-400 dark:hover:bg-graphite-800"
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-graphite-100 dark:hover:bg-graphite-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-aviation-600 text-sm font-medium text-white">
              {user?.avatar ?? 'AD'}
            </div>
            <span className="hidden text-sm font-medium text-graphite-700 dark:text-graphite-200 lg:block">
              {user?.name ?? 'Admin'}
            </span>
            <ChevronDown className="h-4 w-4 text-graphite-500" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-graphite-200 bg-white shadow-lg dark:border-graphite-700 dark:bg-graphite-800">
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/perfil'); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-graphite-700 transition-colors hover:bg-graphite-50 dark:text-graphite-200 dark:hover:bg-graphite-700"
                >
                  <UserCircle className="h-4 w-4" />
                  Meu Perfil
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/configuracoes'); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-graphite-700 transition-colors hover:bg-graphite-50 dark:text-graphite-200 dark:hover:bg-graphite-700"
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </button>
                <div className="border-t border-graphite-200 dark:border-graphite-700" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-alert-red transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function getPageTitle(pathname: string): string {
  const labels: Record<string, string> = {
    'cadastro/bombeiros': 'Bombeiros',
    'cadastro/equipamentos': 'Equipamentos',
    'cadastro/extintores': 'Extintores',
    'cadastro/hidrantes': 'Hidrantes',
    'relatorios/lro': 'LRO',
    'relatorios/bona': 'BONA',
    'relatorios/ptr-ba': 'PTR-BA',
    'relatorios/exercicios': 'Exercícios',
    'relatorios/exercicios/taf': 'TAF',
    'relatorios/exercicios/tp-epr': 'TP/EPR',
    'relatorios/ordem-servico': 'Ordem de Serviço',
    'relatorios/trocas': 'Trocas',
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
  const key = pathname.replace(/^\//, '');
  return labels[key] || 'Dashboard';
}
