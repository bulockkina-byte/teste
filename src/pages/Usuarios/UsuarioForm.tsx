import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { UserRole } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../context/AuthContext';

interface UserData {
  username: string;
  name: string;
  password: string;
  role: UserRole;
}

interface Props {
  user?: { username: string; name: string; role?: UserRole } | null;
  onSave: (data: UserData) => void;
  onClose: () => void;
}

const ROLES: UserRole[] = ['admin', 'gerente', 'chefe', 'lider'];

export function UsuarioForm({ user, onSave, onClose }: Props) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('chefe');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setName(user.name);
      setRole(user.role || 'chefe');
      setPassword('');
    }
  }, [user]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !name || (!user && !password)) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!user && password.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setErro('');
    onSave({ username, name, password, role });
  }

  const input = 'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all duration-200 hover:border-graphite-400 focus:border-aviation-500 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100 dark:focus:border-aviation-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-graphite-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
            {user ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button onClick={onClose} className="rounded-xl p-1 text-graphite-400 transition-all hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-graphite-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Nome Completo *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo"
              className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Usuário (Login) *</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="nome.usuario"
              disabled={!!user}
              className={input + (user ? ' cursor-not-allowed opacity-60' : '')} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
              Senha {user ? '(deixe em branco para manter)' : '*'}
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
              className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Função *</label>
            <select value={role} onChange={e => setRole(e.target.value as UserRole)} className={input}>
              {ROLES.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {erro && <p className="text-sm text-alert-red">{erro}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200 dark:hover:bg-graphite-700">
              Cancelar
            </button>
            <button type="submit"
              className="rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
              {user ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
