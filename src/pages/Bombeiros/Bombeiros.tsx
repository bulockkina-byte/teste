import { useState, useEffect } from 'react';
import { Shield, Search, Plus, Pencil, Trash2, AlertCircle, Lock } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarBombeiros, buscarBombeiro, criarBombeiro, atualizarBombeiro, excluirBombeiro } from '../../services/bombeiroService';
import type { Bombeiro } from '../../types/bombeiro';
import { CARGO_OPTIONS } from '../../types/bombeiro';
import { BombeiroForm } from './BombeiroForm';

export function Bombeiros() {
  const { user } = useAuth();
  const isAdmin = user?.username === 'admin';

  if (!isAdmin) {
    return (
      <PageContainer>
        <PageTitle icon={Shield} title="Bombeiros" />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-graphite-700 dark:bg-graphite-900">
          <Lock className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
            Acesso Restrito
          </h3>
          <p className="text-sm text-graphite-500">
            Apenas administradores podem acessar o cadastro de bombeiros.
          </p>
        </div>
      </PageContainer>
    );
  }

  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [termo, setTermo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Bombeiro | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setBombeiros(termo ? buscarBombeiro(termo) : listarBombeiros());
  }, [termo]);

  function carregar() {
    setBombeiros(termo ? buscarBombeiro(termo) : listarBombeiros());
  }

  function handleSave(data: Omit<Bombeiro, 'id' | 'createdAt' | 'updatedAt'>) {
    if (editando) {
      atualizarBombeiro(editando.id, data);
    } else {
      criarBombeiro(data);
    }
    setFormOpen(false);
    setEditando(null);
    carregar();
  }

  function handleEdit(b: Bombeiro) {
    setEditando(b);
    setFormOpen(true);
  }

  function capitalize(str: string) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }

  function labelCargo(valor: string) {
    const found = CARGO_OPTIONS.find(o => o.value === valor);
    return found ? found.label : valor;
  }

  function handleDelete(id: string) {
    excluirBombeiro(id);
    setConfirmDelete(null);
    carregar();
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle icon={Shield} title="Bombeiros" />
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Pesquisar por matrícula, nome, CPF ou equipe..."
            className="w-full rounded-lg border border-graphite-200 bg-white py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all focus:border-aviation-500 focus:ring-1 focus:ring-aviation-500 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
          />
        </div>
        <button
          onClick={() => { setEditando(null); setFormOpen(true); }}
          className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-aviation-700"
        >
          <Plus className="h-4 w-4" />
          Novo Cadastro
        </button>
      </div>

      {bombeiros.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-graphite-700 dark:bg-graphite-900">
          <Shield className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
            Nenhum bombeiro cadastrado
          </h3>
          <p className="text-sm text-graphite-500">
            Clique em "Novo Cadastro" para adicionar o primeiro bombeiro.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-graphite-200 bg-white dark:border-graphite-700 dark:bg-graphite-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 bg-graphite-50 text-left dark:border-graphite-700 dark:bg-graphite-800">
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Matrícula</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome de Guerra</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Cargo</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Equipe</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Turno</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Situação</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {bombeiros.map(b => (
                <tr key={b.id} className="border-b border-graphite-100 transition-colors hover:bg-graphite-50 dark:border-graphite-800 dark:hover:bg-graphite-800/50">
                  <td className="px-4 py-3 font-medium text-graphite-900 dark:text-graphite-100">{b.matricula}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{capitalize(b.nomeCompleto)}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{capitalize(b.nomeGuerra)}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{labelCargo(b.cargo)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-aviation-50 px-2.5 py-0.5 text-xs font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                      {b.equipe}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{b.turno}</td>
                  <td className="px-4 py-3">
                    {b.dataDesligamento ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-alert-red dark:bg-red-900/20">
                        <AlertCircle className="h-3 w-3" />
                        Inativo
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-status-green/10 px-2.5 py-0.5 text-xs font-medium text-status-green">
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(b)}
                        className="rounded-lg p-1.5 text-graphite-500 transition-colors hover:bg-graphite-100 dark:text-graphite-400 dark:hover:bg-graphite-700"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setConfirmDelete(b.id)}
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
        <BombeiroForm
          bombeiro={editando}
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
              Tem certeza que deseja excluir este bombeiro? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-graphite-300 bg-white px-4 py-2 text-sm font-medium text-graphite-700 transition-colors hover:bg-graphite-50 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="rounded-lg bg-alert-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
