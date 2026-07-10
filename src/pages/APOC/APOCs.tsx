import { useState, useEffect } from 'react';
import { Radio, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { APOCForm } from './APOCForm';
import { listarAPOCs, buscarAPOC, criarAPOC, atualizarAPOC, excluirAPOC } from '../../services/apocService';
import type { APOC } from '../../types/apoc';

export function APOCs() {
  const { user } = useAuth();
  const isAdmin = user?.username === 'admin';

  const [apocs, setApocs] = useState<APOC[]>([]);
  const [termo, setTermo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<APOC | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setApocs(termo ? buscarAPOC(termo) : listarAPOCs());
  }, [termo]);

  function carregar() {
    setApocs(termo ? buscarAPOC(termo) : listarAPOCs());
  }

  function handleSave(data: Omit<APOC, 'id' | 'createdAt' | 'updatedAt' | 'funcao'>) {
    if (editando) {
      atualizarAPOC(editando.id, data);
    } else {
      criarAPOC(data);
    }
    setFormOpen(false);
    setEditando(null);
    carregar();
  }

  function handleDelete(id: string) {
    excluirAPOC(id);
    setConfirmDelete(null);
    carregar();
  }

  function capitalize(str: string) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle icon={Radio} title="APOC - Centro de Operações Aeroportuárias" />
      </div>

      <div className="mb-4 rounded-xl border border-aviation-200/50 bg-aviation-50/50 px-4 py-3 dark:border-aviation-700/30 dark:bg-aviation-900/20">
        <p className="text-sm text-aviation-700 dark:text-aviation-300">
          Pessoal do <strong>Centro de Operações Aeroportuárias</strong> — todos possuem a função <strong>MOTIVA</strong>.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Pesquisar por nome ou e-mail..."
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-700/40 dark:bg-graphite-900/50 dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-graphite-900"
          />
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditando(null); setFormOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Novo APOC
          </button>
        )}
      </div>

      {apocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-graphite-700/40 dark:bg-graphite-900/30">
          <Radio className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
            Nenhum APOC cadastrado
          </h3>
          <p className="text-sm text-graphite-400">
            Clique em "Novo APOC" para adicionar o primeiro membro do APOC.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-graphite-200/60 bg-white/80 backdrop-blur-sm dark:border-graphite-700/40 dark:bg-graphite-900/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 bg-graphite-50 text-left dark:border-graphite-700 dark:bg-graphite-800">
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome de Guerra</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome Completo</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">E-mail</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Função</th>
                {isAdmin && <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {apocs.map(a => (
                <tr key={a.id} className="border-b border-graphite-100 transition-colors hover:bg-graphite-50 dark:border-graphite-800 dark:hover:bg-graphite-800/50">
                  <td className="px-4 py-3 font-medium text-graphite-900 dark:text-graphite-100">{capitalize(a.nomeGuerra)}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{capitalize(a.nomeCompleto)}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{a.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-aviation-50 px-2.5 py-0.5 text-xs font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                      MOTIVA
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditando(a); setFormOpen(true); }}
                          className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-graphite-800 dark:hover:text-graphite-300"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(a.id)}
                          className="rounded-xl p-1.5 text-alert-red transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <APOCForm
          apoc={editando}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditando(null); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-xl shadow-black/5 backdrop-blur-sm dark:bg-graphite-800/95 dark:shadow-black/20">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">
              Confirmar exclusão
            </h3>
            <p className="mb-6 text-sm text-graphite-500">
              Tem certeza que deseja excluir este membro do APOC?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-graphite-300/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-graphite-700 backdrop-blur-sm transition-all duration-200 hover:bg-graphite-50 hover:border-graphite-300 dark:border-graphite-700/40 dark:bg-graphite-800/80 dark:text-graphite-200 dark:hover:bg-graphite-700/50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98]"
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
