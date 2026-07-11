import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, User, Lock } from 'lucide-react';
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
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-16 animate-fadeIn">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl shadow-lg shadow-aviation-500/20">
              <img src="/logobombeiro.jpeg" alt="SCI NVT" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-graphite-900 to-graphite-600 bg-clip-text text-transparent dark:from-graphite-100 dark:to-graphite-400">
                SCI NVT
              </h1>
              <p className="text-xs text-graphite-500 dark:text-graphite-400">
                Sistema de Controle Operacional
              </p>
            </div>
          </div>

          <div className="animate-slideUp">
            <h2 className="mb-1 text-2xl font-bold text-graphite-900 dark:text-graphite-100">
              Bem-vindo de volta
            </h2>
            <p className="mb-8 text-sm text-graphite-500 dark:text-graphite-400">
              Informe suas credenciais para acessar o sistema.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                  Usuário
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400 transition-colors group-focus-within:text-aviation-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="seu.usuario"
                    className="w-full rounded-xl border border-graphite-300/70 bg-white/50 py-2.5 pl-11 pr-4 text-sm text-graphite-900 outline-none transition-all duration-200 placeholder:text-graphite-400 hover:border-graphite-300 focus:border-aviation-500 focus:bg-white focus:ring-4 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card/30 dark:text-graphite-100 dark:placeholder:text-graphite-500 dark:hover:border-graphite-600 dark:focus:border-aviation-400 dark:focus:bg-surface-elevated"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                  Senha
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400 transition-colors group-focus-within:text-aviation-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-graphite-300/70 bg-white/50 py-2.5 pl-11 pr-11 text-sm text-graphite-900 outline-none transition-all duration-200 placeholder:text-graphite-400 hover:border-graphite-300 focus:border-aviation-500 focus:bg-white focus:ring-4 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card/30 dark:text-graphite-100 dark:placeholder:text-graphite-500 dark:hover:border-graphite-600 dark:focus:border-aviation-400 dark:focus:bg-surface-elevated"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-graphite-400 transition-all duration-200 hover:text-graphite-600 dark:hover:text-graphite-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="animate-slideUp rounded-xl bg-red-50 px-4 py-3 text-sm text-alert-red dark:bg-red-900/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98] disabled:opacity-60 disabled:hover:shadow-none"
              >
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-xs text-graphite-400 dark:text-graphite-500 animate-fadeIn">
            © 2026 SCI NVT. Todos os direitos reservados.
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2">
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden p-16">
          <img src="/entradalogin.jpeg" alt="SCI NVT" className="absolute inset-0 h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-black/40" />
          <div className="relative z-10 animate-slideUp text-center">
            <h2 className="text-3xl font-bold text-white drop-shadow-lg">
              Centro de Controle<br />Operacional
            </h2>
            <p className="mt-4 max-w-md text-base text-white/80 leading-relaxed drop-shadow">
              Sistema integrado de gestão para monitoramento de viaturas,
              inspeções e controle operacional com padrão de excelência.
            </p>
            <div className="mt-12 flex justify-center gap-4">
              {[
                { label: 'Segurança', desc: 'Monitoramento 24h' },
                { label: 'Tecnologia', desc: 'Sistema integrado' },
                { label: 'Eficiência', desc: 'Gestão otimizada' },
              ].map(item => (
                <div
                  key={item.label}
                  className="group flex flex-1 flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:border-white/30 hover:shadow-lg hover:shadow-white/10"
                >
                  <span className="text-xs font-semibold uppercase tracking-widest text-white transition-colors group-hover:text-white">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-white/60">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
