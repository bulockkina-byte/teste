import { useState, useEffect } from 'react';
import { Truck, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { ViaturaForm } from './ViaturaForm';
import { listarViaturas, buscarViatura, criarViatura, atualizarViatura, excluirViatura } from '../../services/viaturaService';
import type { Viatura } from '../../types/viatura';

export function Viaturas() {
  const { user } = useAuth();
  const isAdmin = user?.username === 'admin';

  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [termo, setTermo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Viatura | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setViaturas(termo ? buscarViatura(termo) : listarViaturas());
  }, [termo]);

  function carregar() {
    setViaturas(termo ? buscarViatura(termo) : listarViaturas());
  }

  function handleSave(data: Omit<Viatura, 'id' | 'createdAt' | 'updatedAt'>) {
    if (editando) {
      atualizarViatura(editando.id, data);
    } else {
      criarViatura(data);
    }
    setFormOpen(false);
    setEditando(null);
    carregar();
  }

  function handleDelete(id: string) {
    excluirViatura(id);
    setConfirmDelete(null);
    carregar();
  }

  function capitalize(str: string) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }

  function situacaoBadge(s: string) {
    if (s === 'Ativa') return 'bg-status-green/10 text-status-green';
    if (s === 'Em Manutenção') return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-red-50 text-alert-red dark:bg-red-900/20 dark:text-red-400';
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle icon={Truck} title="Viaturas" />
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Pesquisar por prefixo, placa, marca ou equipe..."
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-700/40 dark:bg-graphite-900/50 dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-graphite-900"
          />
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditando(null); setFormOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Nova Viatura
          </button>
        )}
      </div>

      {viaturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-graphite-700/40 dark:bg-graphite-900/30">
          <Truck className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
            Nenhuma viatura cadastrada
          </h3>
          <p className="text-sm text-graphite-400">
            Clique em "Nova Viatura" para cadastrar a primeira viatura.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-graphite-200/60 bg-white/80 backdrop-blur-sm dark:border-graphite-700/40 dark:bg-graphite-900/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 bg-graphite-50 text-left dark:border-graphite-700 dark:bg-graphite-800">
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Prefixo</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Placa</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Tipo</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Marca / Modelo</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Ano</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Equipe</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Situação</th>
                {isAdmin && <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {viaturas.map(v => (
                <tr
                  key={v.id}
                  onClick={() => { setEditando(v); setFormOpen(true); }}
                  className="cursor-pointer border-b border-graphite-100 transition-colors hover:bg-aviation-50/50 dark:border-graphite-800 dark:hover:bg-aviation-900/20"
                >
                  <td className="px-4 py-3 font-bold text-graphite-900 dark:text-graphite-100">{v.prefixo}</td>
                  <td className="px-4 py-3 font-mono text-graphite-700 dark:text-graphite-300">{v.placa}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-aviation-50 px-2.5 py-0.5 text-xs font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                      {v.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{capitalize(v.marca)} {capitalize(v.modelo)}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{v.ano || '-'}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{v.equipe || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${situacaoBadge(v.situacao)}`}>
                      {v.situacao}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setEditando(v); setFormOpen(true); }}
                          className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-graphite-800 dark:hover:text-graphite-300"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDelete(v.id); }}
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
        <ViaturaForm
          viatura={editando}
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
              Tem certeza que deseja excluir esta viatura?
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
