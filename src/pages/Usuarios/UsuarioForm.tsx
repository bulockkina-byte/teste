import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface UserData {
  username: string;
  name: string;
  password: string;
}

interface Props {
  user?: { username: string; name: string } | null;
  onSave: (data: UserData) => void;
  onClose: () => void;
}

export function UsuarioForm({ user, onSave, onClose }: Props) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setName(user.name);
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
    onSave({ username, name, password });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-graphite-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
            {user ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-graphite-500 hover:bg-graphite-100 dark:hover:bg-graphite-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo"
              className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Usuário *</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="nome.usuario"
              disabled={!!user}
              className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm disabled:bg-graphite-50 dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
              Senha {user ? '(deixe em branco para manter)' : '*'}
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
              className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
          </div>

          {erro && <p className="text-sm text-alert-red">{erro}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-graphite-300 bg-white px-4 py-2 text-sm font-medium text-graphite-700 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200">
              Cancelar
            </button>
            <button type="submit"
              className="rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white hover:bg-aviation-700">
              {user ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
