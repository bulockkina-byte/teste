import { useState, useEffect } from 'react';
import { UserCog, Search, Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { UsuarioForm } from './UsuarioForm';

const USERS_KEY = 'sescinc-users';

interface StoredUser {
  name: string;
  password: string;
}

function listarUsuarios(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function salvarUsuarios(data: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(data));
}

export function Usuarios() {
  const { user } = useAuth();
  const isAdmin = user?.username === 'admin';

  const [usuarios, setUsuarios] = useState<[string, StoredUser][]>([]);
  const [termo, setTermo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<{ username: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function carregar() {
    const all = listarUsuarios();
    const entries = Object.entries(all);
    if (termo) {
      const t = termo.toLowerCase();
      setUsuarios(entries.filter(([u, d]) => u.includes(t) || d.name.toLowerCase().includes(t)));
    } else {
      setUsuarios(entries);
    }
  }

  useEffect(() => { carregar(); }, [termo]);

  function handleSave(data: { username: string; name: string; password: string }) {
    const all = listarUsuarios();
    if (editando) {
      const prev = all[editando.username];
      all[data.username] = { name: data.name, password: data.password || prev.password };
      if (data.username !== editando.username) delete all[editando.username];
    } else {
      all[data.username] = { name: data.name, password: data.password };
    }
    salvarUsuarios(all);
    setFormOpen(false);
    setEditando(null);
    carregar();
  }

  function handleDelete(username: string) {
    const all = listarUsuarios();
    delete all[username];
    salvarUsuarios(all);
    setConfirmDelete(null);
    carregar();
  }

  if (!isAdmin) {
    return (
      <PageContainer>
        <PageTitle icon={UserCog} title="Usuários" />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-graphite-700 dark:bg-graphite-900">
          <Lock className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
            Acesso Restrito
          </h3>
          <p className="text-sm text-graphite-500">
            Apenas administradores podem gerenciar usuários.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle icon={UserCog} title="Usuários" />
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Pesquisar por usuário ou nome..."
            className="w-full rounded-lg border border-graphite-200 bg-white py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all focus:border-aviation-500 focus:ring-1 focus:ring-aviation-500 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
          />
        </div>
        <button
          onClick={() => { setEditando(null); setFormOpen(true); }}
          className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-aviation-700"
        >
          <Plus className="h-4 w-4" />
          Novo Usuário
        </button>
      </div>

      {usuarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-graphite-700 dark:bg-graphite-900">
          <UserCog className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
            Nenhum usuário cadastrado
          </h3>
          <p className="text-sm text-graphite-500">
            Clique em "Novo Usuário" para criar o primeiro acesso.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-graphite-200 bg-white dark:border-graphite-700 dark:bg-graphite-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 bg-graphite-50 text-left dark:border-graphite-700 dark:bg-graphite-800">
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Usuário</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Admin</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(([username, data]) => (
                <tr key={username} className="border-b border-graphite-100 transition-colors hover:bg-graphite-50 dark:border-graphite-800 dark:hover:bg-graphite-800/50">
                  <td className="px-4 py-3 font-medium text-graphite-900 dark:text-graphite-100">{username}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{data.name}</td>
                  <td className="px-4 py-3">
                    {username === 'admin' ? (
                      <span className="inline-flex rounded-full bg-aviation-50 px-2.5 py-0.5 text-xs font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                        Sim
                      </span>
                    ) : (
                      <span className="text-graphite-400">Não</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditando({ username, name: data.name }); setFormOpen(true); }}
                        className="rounded-lg p-1.5 text-graphite-500 transition-colors hover:bg-graphite-100 dark:text-graphite-400 dark:hover:bg-graphite-700"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {username !== 'admin' && (
                        <button
                          onClick={() => setConfirmDelete(username)}
                          className="rounded-lg p-1.5 text-alert-red transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <UsuarioForm
          user={editando}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditando(null); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-graphite-800">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">
              Confirmar exclusão
            </h3>
            <p className="mb-6 text-sm text-graphite-500">
              Tem certeza que deseja excluir este usuário? Ele não poderá mais acessar o sistema.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-graphite-300 bg-white px-4 py-2 text-sm font-medium text-graphite-700 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="rounded-lg bg-alert-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
