import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, Lock, UserCircle, Eye, EyeOff, Loader2,
  CheckCircle2, Shield, Sparkles, ArrowRight, Key,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validarConvite, usarConvite } from '../../services/conviteService';

export function ConviteRegister() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [conviteValido, setConviteValido] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successo, setSuccesso] = useState(false);

  useEffect(() => {
    if (codigo) {
      validarConvite(codigo.toUpperCase()).then(c => setConviteValido(!!c));
    }
  }, [codigo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !username || !password || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(name, username, password, 'lider');
      if (codigo) await usarConvite(codigo.toUpperCase(), username);
      setSuccesso(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  if (conviteValido === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-graphite-50 to-graphite-100 dark:from-graphite-900 dark:to-graphite-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-aviation-500" />
          <p className="text-sm text-graphite-500">Validando convite...</p>
        </div>
      </div>
    );
  }

  if (!conviteValido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-graphite-50 to-graphite-100 p-6 dark:from-graphite-900 dark:to-graphite-950">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-red-200 bg-white/80 p-8 text-center shadow-xl backdrop-blur-xl dark:border-red-800/50 dark:bg-graphite-800/80">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-graphite-900 dark:text-graphite-100">
              Convite Inválido
            </h2>
            <p className="mb-6 text-sm text-graphite-500">
              Este convite não existe ou já foi utilizado.
              Solicite um novo link à administração.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 rounded-xl bg-aviation-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-aviation-500"
            >
              Ir para Login <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (successo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-6 dark:from-green-950 dark:to-emerald-950">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-green-200 bg-white/80 p-8 text-center shadow-xl backdrop-blur-xl dark:border-green-800/50 dark:bg-graphite-800/80">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-graphite-900 dark:text-graphite-100">
              Cadastro Realizado!
            </h2>
            <p className="mb-2 text-sm text-graphite-500">
              Sua conta foi criada com sucesso, <strong className="text-graphite-700 dark:text-graphite-300">{name}</strong>.
            </p>
            <p className="mb-8 text-sm text-graphite-500">
              Agora você já pode acessar o sistema com seu usuário.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600"
            >
              Fazer Login <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-sm shadow-aviation-500/20">
              <img src="/logobombeiro.jpeg" alt="SCI NVT" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-graphite-900 dark:text-graphite-100">
                SCI NVT
              </h1>
              <p className="text-xs text-graphite-500">
                Sistema de Controle Operacional
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-graphite-900 dark:text-graphite-100">
              Você foi convidado!
            </h2>
            <p className="text-sm text-graphite-500">
              Preencha seus dados para criar sua conta no sistema.
            </p>
          </div>

          <div className="mb-6 flex items-center gap-3 rounded-xl border border-aviation-200 bg-aviation-50/50 px-4 py-3 dark:border-aviation-800/50 dark:bg-aviation-900/20">
            <Key className="h-5 w-5 shrink-0 text-aviation-500" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-aviation-600 dark:text-aviation-400">
                Código de Convite
              </p>
              <p className="font-mono text-sm font-bold tracking-wider text-aviation-700 dark:text-aviation-300">
                {codigo?.toUpperCase()}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                Nome completo
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated"
                />
              </div>
            </div>

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
                  placeholder="nome.usuario"
                  className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated"
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
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-11 text-sm text-graphite-900 backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated"
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

            <div>
              <label className="mb-1.5 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                Confirmar senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 hover:from-aviation-500 hover:to-aviation-600 disabled:opacity-60 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Cadastrando...' : 'Criar Conta'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-graphite-400">
            © 2026 SCI NVT. Todos os direitos reservados.
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2">
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden p-16">
          <img src="/entradalogin.jpeg" alt="SCI NVT" className="absolute inset-0 h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white drop-shadow-lg">
              Bem-vindo ao SCI NVT
            </h2>
            <p className="mt-4 max-w-md text-white/80 drop-shadow">
              Seu convite foi validado. Crie sua conta e comece a utilizar
              todas as ferramentas de gestão operacional do sistema.
            </p>
            <div className="mt-12 grid grid-cols-3 gap-6">
              {['Segurança', 'Inovação', 'Eficiência'].map(item => (
                <div
                  key={item}
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-4 backdrop-blur-sm"
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-white">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConviteRegister;
