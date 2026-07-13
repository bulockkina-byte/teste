import { useState, useEffect, useMemo } from 'react';
import {
  HardHat, Plus, Save, Pencil, Trash2, AlertTriangle, Search, X, Clock,
  DollarSign, Send, RotateCcw, FileText, ChevronDown, ChevronRight,
  User, CheckCircle2,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarBombeiros } from '../../services/bombeiroService';
import {
  listarEPIs, criarEPI, atualizarEPI, excluirEPI,
  pagarEPI, enviarAutentiqueEPI, assinarEPI, devolverEPI,
} from '../../services/epiService';
import { CATEGORIAS_EPI, EPI_STATUS_LABELS, EPI_STATUS_COLORS } from '../../types/epi';
import type { EPI, EPIStatus } from '../../types/epi';
import type { Bombeiro } from '../../types/bombeiro';

function getDiasParaVencer(dataValidade: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade + 'T00:00:00');
  return Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusValidade(dataValidade: string): { label: string; color: string } {
  const dias = getDiasParaVencer(dataValidade);
  if (dias < 0) return { label: 'Vencido', color: 'bg-red-50 text-alert-red dark:bg-red-900/20 dark:text-red-400' };
  if (dias <= 30) return { label: 'Crítico', color: 'bg-red-50 text-alert-red dark:bg-red-900/20 dark:text-red-400' };
  if (dias <= 150) return { label: 'Próximo ao Vencimento', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' };
  return { label: 'Válido', color: 'bg-status-green/10 text-status-green' };
}

async function getUserRole(username: string): Promise<'admin' | 'gerente' | 'chefe'> {
  if (username === 'admin') return 'admin';
  const users = JSON.parse(localStorage.getItem('sescinc-users') || '{}');
  const stored = users[username];
  if (stored?.role === 'admin_master' || stored?.role === 'admin') return 'admin';
  const b = (await listarBombeiros()).find(
    x => x.nomeGuerra.toLowerCase() === username.toLowerCase() ||
         x.nomeCompleto.toLowerCase().includes(username.toLowerCase()),
  );
  if (b?.cargo === 'GS' || b?.equipe === 'Embaixador') return 'gerente';
  return 'chefe';
}

type Tab = 'funcionarios' | 'epis';

/* ───────── Formulário Inline ───────── */

function EPIFormInline({
  epi,
  funcionarios,
  onSave,
  onCancel,
}: {
  epi?: EPI;
  funcionarios: Bombeiro[];
  onSave: (data: Omit<EPI, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status' | 'dataEnvioAutentique' | 'dataAssinatura' | 'dataDevolucao'>) => void;
  onCancel: () => void;
}) {
  const hoje = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState(epi ? {
    nome: epi.nome, descricao: epi.descricao, colaborador: epi.colaborador,
    colaboradorId: epi.colaboradorId, entreguePor: epi.entreguePor, ca: epi.ca,
    dataPagamento: epi.dataPagamento, dataValidade: epi.dataValidade,
    fornecedor: epi.fornecedor, notas: epi.notas,
  } : {
    nome: '', descricao: '', colaborador: '', colaboradorId: '', entreguePor: '', ca: '',
    dataPagamento: hoje, dataValidade: '',
    fornecedor: '', notas: '',
  });

  const input = 'w-full rounded-xl border border-graphite-300/70 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50';
  const label = 'block mb-1 text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';

  function handleColaboradorChange(value: string) {
    const func = funcionarios.find(f => f.id === value);
    setForm(f => ({
      ...f,
      colaboradorId: value,
      colaborador: func ? func.nomeGuerra : '',
    }));
  }

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
            <select value={form.colaboradorId} onChange={e => handleColaboradorChange(e.target.value)} className={input}>
              <option value="">Selecione o funcionário</option>
              {funcionarios.map(f => (
                <option key={f.id} value={f.id}>{f.nomeGuerra} — {f.nomeCompleto}</option>
              ))}
            </select>
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
            <input type="date" value={form.dataPagamento} readOnly className={input + ' cursor-not-allowed bg-graphite-50/80 font-medium dark:bg-surface-card'} />
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
          <button onClick={onCancel} className="rounded-lg border border-graphite-300/60 bg-white/80 px-3 py-1.5 text-xs font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card/80 dark:text-graphite-200">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.nome || !form.colaboradorId || !form.entreguePor || !form.ca || !form.dataValidade}
            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-all hover:from-aviation-500 hover:to-aviation-600 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="h-3.5 w-3.5" /> Salvar
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ───────── Ficha de EPI por Funcionário ───────── */

function FichaFuncionario({
  funcionario,
  epis,
  canManage,
  onPagar,
  onEnviarAutentique,
  onAssinar,
  onDevolver,
  onEditar,
  onExcluir,
}: {
  funcionario: Bombeiro;
  epis: EPI[];
  canManage: boolean;
  onPagar: (id: string) => void;
  onEnviarAutentique: (id: string) => void;
  onAssinar: (id: string) => void;
  onDevolver: (id: string) => void;
  onEditar: (epi: EPI) => void;
  onExcluir: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const episDoFunc = epis.filter(e => e.colaboradorId === funcionario.id || e.colaborador === funcionario.nomeGuerra);
  const ativos = episDoFunc.filter(e => e.status !== 'devolvido');

  return (
    <div className="rounded-xl border border-graphite-200/60 bg-white/80 backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-graphite-50/80 dark:hover:bg-surface-hover"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-aviation-100 text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-400">
          <User className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100 truncate">{funcionario.nomeGuerra}</p>
          <p className="text-xs text-graphite-500 dark:text-graphite-400 truncate">{funcionario.nomeCompleto} — {funcionario.cargo}</p>
        </div>
        <div className="flex items-center gap-2">
          {ativos.length > 0 && (
            <span className="rounded-full bg-aviation-100 px-2 py-0.5 text-[10px] font-bold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-400">
              {ativos.length} EPI{ativos.length > 1 ? 's' : ''}
            </span>
          )}
          {expanded ? <ChevronDown className="h-4 w-4 text-graphite-400" /> : <ChevronRight className="h-4 w-4 text-graphite-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-graphite-100 px-4 py-3 dark:border-border-dark">
          {episDoFunc.length === 0 ? (
            <p className="py-4 text-center text-xs text-graphite-400">Nenhum EPI registrado para este funcionário.</p>
          ) : (
            <div className="space-y-2">
              {episDoFunc.map(epi => {
                const dias = getDiasParaVencer(epi.dataValidade);
                const validade = getStatusValidade(epi.dataValidade);
                return (
                  <div key={epi.id} className="flex flex-col gap-2 rounded-lg border border-graphite-100 bg-graphite-50/50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-border-dark dark:bg-surface-card">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <HardHat className="h-4 w-4 shrink-0 text-graphite-400" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{epi.nome}</span>
                          {epi.descricao && <span className="text-xs text-graphite-500 dark:text-graphite-400">— {epi.descricao}</span>}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 flex-wrap text-[10px] text-graphite-500 dark:text-graphite-400">
                          <span>CA: {epi.ca}</span>
                          <span>Validade: {new Date(epi.dataValidade + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          <span className={dias < 0 ? 'text-red-500 font-bold' : dias <= 30 ? 'text-red-500' : dias <= 150 ? 'text-yellow-600 dark:text-yellow-400' : ''}>
                            {dias < 0 ? 'Vencido' : `${dias} dias`}
                          </span>
                          {epi.dataPagamento && <span>Pago: {new Date(epi.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                          {epi.dataAssinatura && <span>Assinado: {new Date(epi.dataAssinatura + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                          {epi.dataDevolucao && <span>Devolvido: {new Date(epi.dataDevolucao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${EPI_STATUS_COLORS[epi.status]}`}>
                        {EPI_STATUS_LABELS[epi.status]}
                      </span>
                      {canManage && (
                        <>
                          {epi.status === 'entregue' && (
                            <button onClick={() => onPagar(epi.id)} title="Marcar como Pago"
                              className="flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 transition-all hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50">
                              <DollarSign className="h-3 w-3" /> Pagar
                            </button>
                          )}
                          {epi.status === 'pago' && (
                            <button onClick={() => onEnviarAutentique(epi.id)} title="Enviar para Autentique"
                              className="flex items-center gap-1 rounded-lg bg-purple-100 px-2 py-1 text-[10px] font-bold text-purple-700 transition-all hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50">
                              <Send className="h-3 w-3" /> Autentique
                            </button>
                          )}
                          {epi.status === 'enviado_autentique' && (
                            <button onClick={() => onAssinar(epi.id)} title="Marcar como Assinado"
                              className="flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700 transition-all hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50">
                              <CheckCircle2 className="h-3 w-3" /> Assinado
                            </button>
                          )}
                          {epi.status !== 'devolvido' && (
                            <button onClick={() => onDevolver(epi.id)} title="Devolver EPI"
                              className="flex items-center gap-1 rounded-lg bg-graphite-100 px-2 py-1 text-[10px] font-bold text-graphite-600 transition-all hover:bg-graphite-200 dark:bg-graphite-700 dark:text-graphite-300 dark:hover:bg-graphite-600">
                              <RotateCcw className="h-3 w-3" /> Devolver
                            </button>
                          )}
                          <button onClick={() => onEditar(epi)} title="Editar"
                            className="rounded-lg p-1 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => onExcluir(epi.id)} title="Excluir"
                            className="rounded-lg p-1 text-alert-red hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── Página principal ───────── */

export function EPIs() {
  const { user } = useAuth();
  const username = user?.username || '';
  const [role, setRole] = useState<'admin' | 'gerente' | 'chefe'>('chefe');
  useEffect(() => { (async () => { setRole(await getUserRole(username)); })(); }, [username]);
  const isAdmin = role === 'admin';
  const isGerente = role === 'gerente';
  const canManage = isAdmin;

  const [tab, setTab] = useState<Tab>('funcionarios');
  const [epis, setEpis] = useState<EPI[]>([]);
  const [funcionarios, setFuncionarios] = useState<Bombeiro[]>([]);
  const [termo, setTermo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<EPI | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function carregar() {
    const [episData, funcsData] = await Promise.all([listarEPIs(), listarBombeiros()]);
    setEpis(episData);
    setFuncionarios(funcsData);
  }
  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    if (!termo) return epis;
    const t = termo.toLowerCase();
    return epis.filter(e =>
      e.nome.toLowerCase().includes(t) ||
      e.colaborador.toLowerCase().includes(t) ||
      e.descricao.toLowerCase().includes(t) ||
      e.fornecedor.toLowerCase().includes(t)
    );
  }, [epis, termo]);

  const funcionariosFiltrados = useMemo(() => {
    if (!termo) return funcionarios;
    const t = termo.toLowerCase();
    return funcionarios.filter(f =>
      f.nomeGuerra.toLowerCase().includes(t) ||
      f.nomeCompleto.toLowerCase().includes(t) ||
      f.cargo.toLowerCase().includes(t) ||
      f.equipe.toLowerCase().includes(t)
    );
  }, [funcionarios, termo]);

  const episProximosVencer = useMemo(() => {
    if (!isGerente && !isAdmin) return [];
    return epis.filter(e => {
      const dias = getDiasParaVencer(e.dataValidade);
      return dias >= 0 && dias <= 150 && e.status !== 'devolvido';
    });
  }, [epis, isGerente, isAdmin]);

  async function handleSave(data: Omit<EPI, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status' | 'dataEnvioAutentique' | 'dataAssinatura' | 'dataDevolucao'>) {
    if (editando && editando.id) {
      await atualizarEPI(editando.id, data);
    } else {
      await criarEPI({ ...data, createdBy: username });
    }
    await carregar();
    setEditando(null);
    setFormOpen(false);
  }

  async function handleDelete(id: string) {
    await excluirEPI(id);
    setConfirmDelete(null);
    await carregar();
  }

  async function handlePagar(id: string) {
    await pagarEPI(id);
    await carregar();
  }

  async function handleEnviarAutentique(id: string) {
    await enviarAutentiqueEPI(id);
    await carregar();
  }

  async function handleAssinar(id: string) {
    await assinarEPI(id);
    await carregar();
  }

  async function handleDevolver(id: string) {
    await devolverEPI(id);
    await carregar();
  }

  return (
    <PageContainer>
      <PageTitle icon={HardHat} title="EPIs" />

      {/* Notificação EPIs próximos ao vencimento */}
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
                      <span className="text-yellow-600 dark:text-yellow-400">— {e.colaborador}</span>
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

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-graphite-200/60 bg-white/60 p-1 backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
        <button
          onClick={() => setTab('funcionarios')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === 'funcionarios'
              ? 'bg-aviation-100 text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-400'
              : 'text-graphite-500 hover:bg-graphite-100 hover:text-graphite-700 dark:text-graphite-400 dark:hover:bg-surface-hover'
          }`}
        >
          <User className="h-4 w-4" /> Funcionários
        </button>
        <button
          onClick={() => setTab('epis')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === 'epis'
              ? 'bg-aviation-100 text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-400'
              : 'text-graphite-500 hover:bg-graphite-100 hover:text-graphite-700 dark:text-graphite-400 dark:hover:bg-surface-hover'
          }`}
        >
          <HardHat className="h-4 w-4" /> Todos os EPIs
        </button>
      </div>

      {/* Barra de busca e botão incluir */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder={tab === 'funcionarios' ? 'Pesquisar por nome, equipe, cargo...' : 'Pesquisar por nome, responsável, fornecedor...'}
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated"
          />
        </div>
        {canManage && tab === 'epis' && (
          <button
            onClick={() => { setEditando(null); setFormOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Incluir EPI
          </button>
        )}
      </div>

      {/* Formulário inline */}
      {formOpen && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-aviation-200/60 bg-white/90 shadow-lg backdrop-blur-sm dark:border-aviation-700/40 dark:bg-surface-card/90">
          <div className="flex items-center justify-between border-b border-graphite-200/60 px-4 py-3 dark:border-border-dark">
            <h3 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{editando ? 'Editar EPI' : 'Novo EPI'}</h3>
            <button onClick={() => { setFormOpen(false); setEditando(null); }} className="rounded-lg p-1 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <EPIFormInline epi={editando || undefined} funcionarios={funcionarios} onSave={handleSave} onCancel={() => { setFormOpen(false); setEditando(null); }} />
          </div>
        </div>
      )}

      {/* Tab: Funcionários */}
      {tab === 'funcionarios' && (
        <div className="space-y-2">
          {funcionariosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
              <User className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
              <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum funcionário encontrado</h3>
            </div>
          ) : (
            funcionariosFiltrados.map(func => (
              <FichaFuncionario
                key={func.id}
                funcionario={func}
                epis={epis}
                canManage={canManage}
                onPagar={handlePagar}
                onEnviarAutentique={handleEnviarAutentique}
                onAssinar={handleAssinar}
                onDevolver={handleDevolver}
                onEditar={(e) => { setEditando(e); setFormOpen(true); }}
                onExcluir={(id) => { setConfirmDelete(id); }}
              />
            ))
          )}
        </div>
      )}

      {/* Tab: Todos os EPIs */}
      {tab === 'epis' && (
        <>
          {filtradas.length === 0 && !formOpen ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
              <HardHat className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
              <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum EPI cadastrado</h3>
              <p className="text-sm text-graphite-400">
                {canManage ? 'Clique em "Incluir EPI" para cadastrar o primeiro.' : 'Nenhum EPI encontrado no sistema.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-graphite-200/60 bg-white/80 backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-graphite-200 bg-graphite-50 text-left dark:border-border-dark dark:bg-surface-card">
                    <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">EPI</th>
                    <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">CA</th>
                    <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Colaborador</th>
                    <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Pagamento</th>
                    <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Validade</th>
                    <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Dias</th>
                    <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Status EPI</th>
                    <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Status</th>
                    {canManage && <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(e => {
                    const dias = getDiasParaVencer(e.dataValidade);
                    const validade = getStatusValidade(e.dataValidade);
                    return (
                      <tr key={e.id} className="border-b border-graphite-100 transition-colors hover:bg-aviation-50/50 dark:border-border-dark dark:hover:bg-aviation-900/20">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-bold text-graphite-900 dark:text-graphite-100">{e.nome}</p>
                            {e.descricao && <p className="text-xs text-graphite-500 dark:text-graphite-400">{e.descricao}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-graphite-700 dark:text-graphite-300">{e.ca}</td>
                        <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{e.colaborador}</td>
                        <td className="px-4 py-3 font-mono text-xs text-graphite-700 dark:text-graphite-300">
                          {e.dataPagamento ? new Date(e.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
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
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium ${validade.color}`}>
                            {validade.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium ${EPI_STATUS_COLORS[e.status]}`}>
                            {EPI_STATUS_LABELS[e.status]}
                          </span>
                        </td>
                        {canManage && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {e.status === 'entregue' && (
                                <button onClick={() => handlePagar(e.id)} title="Pagar"
                                  className="rounded-lg bg-amber-100 p-1 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                                  <DollarSign className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {e.status === 'pago' && (
                                <button onClick={() => handleEnviarAutentique(e.id)} title="Enviar Autentique"
                                  className="rounded-lg bg-purple-100 p-1 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {e.status === 'enviado_autentique' && (
                                <button onClick={() => handleAssinar(e.id)} title="Assinado"
                                  className="rounded-lg bg-green-100 p-1 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {e.status !== 'devolvido' && (
                                <button onClick={() => handleDevolver(e.id)} title="Devolver"
                                  className="rounded-lg bg-graphite-100 p-1 text-graphite-600 hover:bg-graphite-200 dark:bg-graphite-700 dark:text-graphite-300">
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button onClick={() => { setEditando(e); setFormOpen(true); }} title="Editar"
                                className="rounded-lg p-1 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => setConfirmDelete(e.id)} title="Excluir"
                                className="rounded-lg p-1 text-alert-red hover:bg-red-50 dark:hover:bg-red-900/20">
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
        </>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-xl shadow-black/5 backdrop-blur-sm dark:bg-surface-elevated/95 dark:shadow-black/20">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500 dark:text-graphite-400">Tem certeza que deseja excluir este EPI?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-graphite-300/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card/80 dark:text-graphite-200">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98]">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default EPIs;
