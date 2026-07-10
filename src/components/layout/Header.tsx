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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-graphite-200/60 glass px-6 dark:glass-dark dark:border-graphite-700/30">
      <div className="flex flex-col">
        <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
          {pageTitle}
        </h2>
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            placeholder="Pesquisar..."
            className="w-64 rounded-xl border border-graphite-200/60 bg-graphite-100/50 py-2 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all duration-200 focus:w-72 focus:border-aviation-400/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-700/50 dark:bg-graphite-800/50 dark:text-graphite-100 dark:placeholder-graphite-500 dark:focus:border-aviation-400/30 dark:focus:bg-graphite-800"
          />
        </div>

        <button className="relative rounded-xl p-2 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:text-graphite-500 dark:hover:bg-graphite-800 dark:hover:text-graphite-300">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-alert-red ring-2 ring-white dark:ring-graphite-900" />
        </button>

        <button className="rounded-xl p-2 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:text-graphite-500 dark:hover:bg-graphite-800 dark:hover:text-graphite-300">
          <MessageSquare className="h-5 w-5" />
        </button>

        <div className="mx-1 h-6 w-px bg-graphite-200/60 dark:bg-graphite-700/40" />

        <button
          onClick={toggleTheme}
          className="rounded-xl p-2 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:text-graphite-500 dark:hover:bg-graphite-800 dark:hover:text-graphite-300"
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
            className="flex items-center gap-2 rounded-xl p-1.5 transition-all duration-200 hover:bg-graphite-100 dark:hover:bg-graphite-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-medium text-white shadow-sm">
              {user?.avatar ?? 'AD'}
            </div>
            <span className="hidden text-sm font-medium text-graphite-700 dark:text-graphite-200 lg:block">
              {user?.name ?? 'Admin'}
            </span>
            <ChevronDown className={`h-4 w-4 text-graphite-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-graphite-200/60 bg-white shadow-xl shadow-black/5 animate-scaleIn dark:border-graphite-700/40 dark:bg-graphite-800/95 dark:shadow-black/20">
                <div className="px-4 py-3 border-b border-graphite-100 dark:border-graphite-700/50">
                  <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{user?.name}</p>
                  <p className="text-xs text-graphite-400">@{user?.username}</p>
                </div>
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/perfil'); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-graphite-600 transition-colors hover:bg-aviation-50 hover:text-aviation-700 dark:text-graphite-300 dark:hover:bg-aviation-900/20 dark:hover:text-aviation-300"
                >
                  <UserCircle className="h-4 w-4" />
                  Meu Perfil
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/configuracoes'); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-graphite-600 transition-colors hover:bg-aviation-50 hover:text-aviation-700 dark:text-graphite-300 dark:hover:bg-aviation-900/20 dark:hover:text-aviation-300"
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </button>
                <div className="border-t border-graphite-100 dark:border-graphite-700/50" />
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
