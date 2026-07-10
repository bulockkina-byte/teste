import { useState, useEffect, useMemo } from 'react';
import {
  HardHat, Plus, Save, Pencil, Trash2, AlertTriangle, Search, X, Clock,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarBombeiros } from '../../services/bombeiroService';
import { listarEPIs, criarEPI, atualizarEPI, excluirEPI } from '../../services/epiService';
import { CATEGORIAS_EPI } from '../../types/epi';
import type { EPI } from '../../types/epi';

function getDiasParaVencer(dataValidade: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade + 'T00:00:00');
  return Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusEPI(dataValidade: string): { label: string; color: string } {
  const dias = getDiasParaVencer(dataValidade);
  if (dias < 0) return { label: 'Vencido', color: 'bg-red-50 text-alert-red dark:bg-red-900/20 dark:text-red-400' };
  if (dias <= 30) return { label: 'Crítico', color: 'bg-red-50 text-alert-red dark:bg-red-900/20 dark:text-red-400' };
  if (dias <= 150) return { label: 'Próximo ao Vencimento', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' };
  return { label: 'Válido', color: 'bg-status-green/10 text-status-green' };
}

function getUserRole(username: string): 'admin' | 'gerente' | 'chefe' {
  if (username === 'admin') return 'admin';
  const b = listarBombeiros().find(
    x => x.nomeGuerra.toLowerCase() === username.toLowerCase() ||
         x.nomeCompleto.toLowerCase().includes(username.toLowerCase()),
  );
  if (b?.cargo === 'GS' || b?.equipe === 'Gerência') return 'gerente';
  return 'chefe';
}

/* ───────── Formulário Inline ───────── */

function EPIFormInline({
  epi,
  onSave,
  onCancel,
}: {
  epi?: EPI;
  onSave: (data: Omit<EPI, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  onCancel: () => void;
}) {
  const hoje = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState(epi ? {
    nome: epi.nome, descricao: epi.descricao, colaborador: epi.colaborador,
    entreguePor: epi.entreguePor, ca: epi.ca,
    dataPagamento: epi.dataPagamento, dataValidade: epi.dataValidade,
    fornecedor: epi.fornecedor, notas: epi.notas,
  } : {
    nome: '', descricao: '', colaborador: '', entreguePor: '', ca: '',
    dataPagamento: hoje, dataValidade: '',
    fornecedor: '', notas: '',
  });

  const input = 'w-full rounded-xl border border-graphite-300/70 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-700/50 dark:bg-graphite-900/50 dark:text-graphite-100 dark:focus:border-aviation-400/50';
  const label = 'block mb-1 text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';

  return (
    <tr className="bg-aviation-50/50 dark:bg-aviation-900/10">
      <td className="px-3 py-3" colSpan={8}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={label}>Nome do EPI *</label>
            <select value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={input}>
              <option value="">Selecione</option>
              {CATEGORIAS_EPI.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Descrição</label>
            <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className={input} placeholder="Ex: Capacete Classe B" />
          </div>
          <div>
            <label className={label}>Colaborador (Recebedor) *</label>
            <input value={form.colaborador} onChange={e => setForm(f => ({ ...f, colaborador: e.target.value }))} className={input} placeholder="Nome de quem recebe" />
          </div>
          <div>
            <label className={label}>Entregue Por *</label>
            <input value={form.entreguePor} onChange={e => setForm(f => ({ ...f, entreguePor: e.target.value }))} className={input} placeholder="Nome de quem entregou" />
          </div>
          <div>
            <label className={label}>Certificado de Aprovação (CA) *</label>
            <input value={form.ca} onChange={e => setForm(f => ({ ...f, ca: e.target.value }))} className={input} placeholder="Nº do CA" />
          </div>
          <div>
            <label className={label}>Fornecedor</label>
            <input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} className={input} />
          </div>
          <div>
            <label className={label}>Data de Pagamento</label>
            <input type="date" value={form.dataPagamento} readOnly className={input + ' cursor-not-allowed bg-graphite-50/80 font-medium dark:bg-graphite-900/30'} />
          </div>
          <div>
            <label className={label}>Data de Validade *</label>
            <input type="date" value={form.dataValidade} onChange={e => setForm(f => ({ ...f, dataValidade: e.target.value }))} className={input} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className={label}>Notas</label>
            <input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className={input} placeholder="Observações" />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-graphite-300/60 bg-white/80 px-3 py-1.5 text-xs font-medium text-graphite-700 dark:border-graphite-700/40 dark:bg-graphite-800/80 dark:text-graphite-200">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.nome || !form.colaborador || !form.entreguePor || !form.ca || !form.dataValidade}
            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-all hover:from-aviation-500 hover:to-aviation-600 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="h-3.5 w-3.5" /> Salvar
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ───────── Página principal ───────── */

export function EPIs() {
  const { user } = useAuth();
  const username = user?.username || '';
  const role = useMemo(() => getUserRole(username), [username]);
  const isAdmin = role === 'admin';
  const isGerente = role === 'gerente';
  const canManage = isAdmin;

  const [epis, setEpis] = useState<EPI[]>([]);
  const [termo, setTermo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<EPI | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function carregar() { setEpis(listarEPIs()); }
  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    if (!termo) return epis;
    const t = termo.toLowerCase();
    return epis.filter(e =>
      e.nome.toLowerCase().includes(t) ||
      e.responsavel.toLowerCase().includes(t) ||
      e.descricao.toLowerCase().includes(t) ||
      e.fornecedor.toLowerCase().includes(t)
    );
  }, [epis, termo]);

  const episProximosVencer = useMemo(() => {
    if (!isGerente && !isAdmin) return [];
    return epis.filter(e => {
      const dias = getDiasParaVencer(e.dataValidade);
      return dias >= 0 && dias <= 150;
    });
  }, [epis, isGerente, isAdmin]);

  function handleSave(data: Omit<EPI, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) {
    if (editando && editando.id) {
      atualizarEPI(editando.id, data);
    } else {
      criarEPI({ ...data, createdBy: username });
    }
    carregar();
    setEditando(null);
    setFormOpen(false);
  }

  function handleDelete(id: string) {
    excluirEPI(id);
    setConfirmDelete(null);
    carregar();
  }

  return (
    <PageContainer>
      <PageTitle icon={HardHat} title="EPIs" />

      {/* Notificação para gerente/admin */}
      {episProximosVencer.length > 0 && (
        <div className="mb-6 rounded-2xl border border-yellow-300/60 bg-yellow-50/80 p-4 backdrop-blur-sm dark:border-yellow-700/40 dark:bg-yellow-900/20">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/40">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-300">
                EPIs Próximos ao Vencimento ({episProximosVencer.length})
              </h3>
              <p className="mt-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                Os seguintes EPIs vencem nos próximos 5 meses:
              </p>
              <div className="mt-2 space-y-1">
                {episProximosVencer.map(e => {
                  const dias = getDiasParaVencer(e.dataValidade);
                  return (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3 shrink-0 text-yellow-500" />
                      <span className="font-medium text-yellow-800 dark:text-yellow-300">{e.nome}</span>
                      <span className="text-yellow-600 dark:text-yellow-400">— {e.responsavel}</span>
                      <span className="text-yellow-500 dark:text-yellow-500">
                        ({dias === 0 ? 'vence hoje' : dias === 1 ? 'vence amanhã' : `${dias} dias restantes`})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Pesquisar por nome, responsável, fornecedor..."
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-700/40 dark:bg-graphite-900/50 dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-graphite-900"
          />
        </div>
        {canManage && (
          <button
            onClick={() => { setEditando(null); setFormOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Incluir EPI
          </button>
        )}
      </div>

      {/* Formulário inline no topo */}
      {formOpen && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-aviation-200/60 bg-white/90 shadow-lg backdrop-blur-sm dark:border-aviation-700/40 dark:bg-graphite-800/90">
          <div className="flex items-center justify-between border-b border-graphite-200/60 px-4 py-3 dark:border-graphite-700/50">
            <h3 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{editando ? 'Editar EPI' : 'Novo EPI'}</h3>
            <button onClick={() => { setFormOpen(false); setEditando(null); }} className="rounded-lg p-1 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-graphite-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <EPIFormInline epi={editando || undefined} onSave={handleSave} onCancel={() => { setFormOpen(false); setEditando(null); }} />
          </div>
        </div>
      )}

      {filtradas.length === 0 && !formOpen ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-graphite-700/40 dark:bg-graphite-900/30">
          <HardHat className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum EPI cadastrado</h3>
          <p className="text-sm text-graphite-400">
            {canManage ? 'Clique em "Incluir EPI" para cadastrar o primeiro.' : 'Nenhum EPI encontrado no sistema.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-graphite-200/60 bg-white/80 backdrop-blur-sm dark:border-graphite-700/40 dark:bg-graphite-900/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 bg-graphite-50 text-left dark:border-graphite-700 dark:bg-graphite-800">
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">EPI</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">CA</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Colaborador</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Entregue Por</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Validade</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Dias Restantes</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Status</th>
                {canManage && <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(e => {
                const dias = getDiasParaVencer(e.dataValidade);
                const status = getStatusEPI(e.dataValidade);
                return (
                  <tr key={e.id} className="border-b border-graphite-100 transition-colors hover:bg-aviation-50/50 dark:border-graphite-800 dark:hover:bg-aviation-900/20">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-graphite-900 dark:text-graphite-100">{e.nome}</p>
                        {e.descricao && <p className="text-xs text-graphite-500">{e.descricao}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{e.responsavel}</td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite-700 dark:text-graphite-300">
                      {new Date(e.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite-700 dark:text-graphite-300">
                      {new Date(e.dataValidade + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${dias < 0 ? 'text-red-500' : dias <= 30 ? 'text-red-500' : dias <= 150 ? 'text-yellow-600 dark:text-yellow-400' : 'text-graphite-600 dark:text-graphite-400'}`}>
                        {dias < 0 ? 'Vencido' : `${dias} dias`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-graphite-500 dark:text-graphite-400">{e.fornecedor || '—'}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditando(e); setFormOpen(true); }}
                            className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-graphite-800 dark:hover:text-graphite-300"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(e.id)}
                            className="rounded-xl p-1.5 text-alert-red transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-xl shadow-black/5 backdrop-blur-sm dark:bg-graphite-800/95 dark:shadow-black/20">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500">Tem certeza que deseja excluir este EPI?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-graphite-300/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-graphite-700/40 dark:bg-graphite-800/80 dark:text-graphite-200">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98]">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
