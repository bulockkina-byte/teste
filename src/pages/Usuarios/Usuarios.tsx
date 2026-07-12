import { useState, useEffect, useMemo } from 'react';
import { UserCog, Search, Plus, Pencil, Trash2, Lock, User, Link } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, type UserRole } from '../../context/AuthContext';
import type { StoredUser } from '../../context/AuthContext';
import { UsuarioForm } from './UsuarioForm';
import { listarAtivos } from '../../services/bombeiroService';
import { listarAPOCs } from '../../services/apocService';
import type { Bombeiro } from '../../types/bombeiro';
import type { APOC } from '../../types/apoc';
import { CARGO_OPTIONS } from '../../types/bombeiro';
import { FUNCAO_APOC_OPTIONS } from '../../types/apoc';

const USERS_KEY = 'sescinc-users';

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

const ROLE_BADGE: Record<string, string> = {
  admin_master: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  admin: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  gerente: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  chefe: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  lider: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
};

export function Usuarios() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [usuarios, setUsuarios] = useState<[string, StoredUser][]>([]);
  const [termo, setTermo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<{ username: string; name: string; role?: UserRole; personId?: string; personType?: 'bombeiro' | 'apoc' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [apocs, setApocs] = useState<APOC[]>([]);

  useEffect(() => {
    Promise.all([listarAtivos(), listarAPOCs()]).then(([b, a]) => {
      setBombeiros(b);
      setApocs(a);
    }).catch(() => {});
  }, []);

  function resolvePerson(data: StoredUser) {
    if (!data.personId || !data.personType) return null;
    if (data.personType === 'bombeiro') {
      return bombeiros.find(b => b.id === data.personId) || null;
    }
    return apocs.find(a => a.id === data.personId) || null;
  }

  function carregar() {
    const all = listarUsuarios();
    const entries = Object.entries(all);
    if (termo) {
      const t = termo.toLowerCase();
      setUsuarios(entries.filter(([u, d]) =>
        u.includes(t) || d.name.toLowerCase().includes(t) || (ROLE_LABELS[d.role] || '').toLowerCase().includes(t)
      ));
    } else {
      setUsuarios(entries);
    }
  }

  useEffect(() => { carregar(); }, [termo]);

  function handleSave(data: { username: string; name: string; password: string; role: UserRole; personId?: string; personType?: 'bombeiro' | 'apoc' }) {
    const all = listarUsuarios();

    if (editando) {
      const prev = all[editando.username];
      if (!prev) return;

      if (editando.username === 'admin_master') {
        return;
      }

      if (data.role === 'admin_master') {
        return;
      }

      if (data.role === 'admin' && user?.role !== 'admin_master') {
        return;
      }

      all[data.username] = {
        name: data.name,
        password: data.password || prev.password,
        role: data.role,
        personId: data.personId,
        personType: data.personType,
      };
      if (data.username !== editando.username) delete all[editando.username];
    } else {
      if (data.role === 'admin_master') {
        return;
      }
      if (data.role === 'admin' && user?.role !== 'admin_master') {
        return;
      }
      all[data.username] = { name: data.name, password: data.password, role: data.role, personId: data.personId, personType: data.personType };
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <Lock className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Acesso Restrito</h3>
          <p className="text-sm text-graphite-400 dark:text-graphite-500">Apenas administradores podem gerenciar usuários.</p>
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
            placeholder="Pesquisar por usuário, nome ou função..."
            className="w-full rounded-xl border border-graphite-300 bg-white py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all hover:border-graphite-400 focus:border-aviation-500 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:hover:border-graphite-500 dark:focus:border-aviation-400 dark:focus:bg-surface-elevated dark:focus:ring-aviation-400/10 dark:placeholder:text-graphite-500"
          />
        </div>
        <button
          onClick={() => { setEditando(null); setFormOpen(true); }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Novo Usuário
        </button>
      </div>

      {usuarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <UserCog className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum usuário cadastrado</h3>
          <p className="text-sm text-graphite-400 dark:text-graphite-500">Clique em "Novo Usuário" para criar o primeiro acesso.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-graphite-200 bg-white dark:border-border-dark dark:bg-surface-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 bg-graphite-50 text-left dark:border-border-dark dark:bg-graphite-900">
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome Completo</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Usuário</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Função</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(([username, data]) => {
                const person = resolvePerson(data);
                const personFoto = person && 'foto' in person ? (person as Bombeiro).foto : undefined;
                const personGuerra = person && 'nomeGuerra' in person ? (person as Bombeiro | APOC).nomeGuerra : undefined;
                const personCargo = person && 'cargo' in person
                  ? CARGO_OPTIONS.find(c => c.value === (person as Bombeiro).cargo)?.label
                  : person && 'funcao' in person
                    ? FUNCAO_APOC_OPTIONS.find(f => f.value === (person as APOC).funcao)?.label
                    : undefined;

                return (
                <tr key={username} className="border-b border-graphite-100 transition-colors hover:bg-graphite-50 dark:border-border-dark dark:hover:bg-surface-hover/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-aviation-500 to-aviation-700 text-xs font-bold text-white">
                        {personFoto ? (
                          <img src={personFoto} className="h-full w-full object-cover" alt="" />
                        ) : (
                          data.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-graphite-900 dark:text-graphite-100 truncate">{data.name}</p>
                        {personGuerra && (
                          <p className="text-[11px] text-graphite-500 dark:text-graphite-400 truncate">{personGuerra}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-graphite-600 dark:text-graphite-400">{username}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGE[data.role] || ROLE_BADGE.chefe}`}>
                        {ROLE_LABELS[data.role] || data.role}
                      </span>
                      {personCargo && (
                        <span className="text-[11px] text-graphite-500 dark:text-graphite-400">{personCargo}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {username !== 'admin_master' && (
                        <>
                          {!(data.role === 'admin' && user?.role !== 'admin_master') && (
                            <button
                              onClick={() => { setEditando({ username, name: data.name, role: data.role, personId: data.personId, personType: data.personType }); setFormOpen(true); }}
                              className="rounded-xl p-1.5 text-graphite-400 transition-all hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {username !== 'admin' && !(data.role === 'admin' && user?.role !== 'admin_master') && (
                            <button
                              onClick={() => setConfirmDelete(username)}
                              className="rounded-xl p-1.5 text-alert-red transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <UsuarioForm
          user={editando}
          isProtected={editando?.username === 'admin_master' || (editando?.username === 'admin' && user?.role !== 'admin_master')}
          currentUserRole={user?.role}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditando(null); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-card">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500 dark:text-graphite-400">Tem certeza que deseja excluir este usuário? Ele não poderá mais acessar o sistema.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98]">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
