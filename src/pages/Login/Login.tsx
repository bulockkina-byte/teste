import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Eye, EyeOff, Loader2, User, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-aviation-600">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-graphite-900 dark:text-graphite-100">
                SESCINC Manager
              </h1>
              <p className="text-xs text-graphite-500">
                Sistema de Controle Operacional
              </p>
            </div>
          </div>

          <h2 className="mb-2 text-2xl font-bold text-graphite-900 dark:text-graphite-100">
            Acessar o sistema
          </h2>
          <p className="mb-8 text-sm text-graphite-500">
            Informe suas credenciais para continuar.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="seu.usuario"
                  className="w-full rounded-lg border border-graphite-300 bg-white py-2.5 pl-10 pr-4 text-sm text-graphite-900 outline-none transition-all focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/20 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-graphite-300 bg-white py-2.5 pl-10 pr-10 text-sm text-graphite-900 outline-none transition-all focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/20 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite-400 hover:text-graphite-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-alert-red">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-aviation-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-aviation-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-graphite-400">
            © 2026 SESCINC. Todos os direitos reservados.
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2">
        <div className="flex w-full flex-col items-center justify-center bg-gradient-to-br from-aviation-800 via-aviation-700 to-aviation-900 p-16">
          <Plane className="mb-6 h-20 w-20 text-aviation-300/40" />
          <h2 className="text-center text-2xl font-bold text-white">
            Centro de Controle Operacional
          </h2>
          <p className="mt-4 max-w-md text-center text-aviation-200/80">
            Sistema integrado de gestão para monitoramento, inspeções e controle
            operacional com padrão de excelência aeroportuária.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            {['Segurança', 'Tecnologia', 'Eficiência'].map(item => (
              <div
                key={item}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-aviation-300">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
