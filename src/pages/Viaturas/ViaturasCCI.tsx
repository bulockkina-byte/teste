import { useState, useEffect, useMemo } from 'react';
import { Truck, Search, Plus, Check, X, Trash2, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarViaturas } from '../../services/viaturaService';
import { listarPanes, criarPane, atualizarPane, excluirPane } from '../../services/viaturaPaneService';
import type { Viatura, ViaturaPane, StatusViatura } from '../../types/viatura';
import { STATUS_VIATURA_OPTIONS, STATUS_PANE_OPTIONS } from '../../types/viatura';
import { useDebounce } from '../../hooks/useDebounce';

function statusColor(s: StatusViatura) {
  return STATUS_VIATURA_OPTIONS.find(o => o.value === s)?.color || '';
}

function paneColor(s: string) {
  return STATUS_PANE_OPTIONS.find(o => o.value === s)?.color || '';
}

const inputCls = 'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400 dark:focus:ring-aviation-400/10 dark:scheme-dark';
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';

function fmtDate(d: string) {
  if (!d) return '-';
  return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR');
}

export function ViaturasCCI() {
  const { user } = useAuth();
  const username = user?.username || '';

  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [panesPorViatura, setPanesPorViatura] = useState<Record<string, ViaturaPane[]>>({});
  const [carregandoPanes, setCarregandoPanes] = useState<Record<string, boolean>>({});
  const [expandido, setExpandido] = useState<string | null>(null);

  const [termo, setTermo] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeletePane, setConfirmDeletePane] = useState<{ viaturaId: string; paneId: string } | null>(null);

  const debouncedTermo = useDebounce(termo, 400);

  useEffect(() => {
    listarViaturas()
      .then(setViaturas)
      .catch(() => {});
  }, []);

  async function carregarPanes(viaturaId: string) {
    setCarregandoPanes(prev => ({ ...prev, [viaturaId]: true }));
    try {
      const panes = await listarPanes(viaturaId);
      setPanesPorViatura(prev => ({ ...prev, [viaturaId]: panes }));
    } finally {
      setCarregandoPanes(prev => ({ ...prev, [viaturaId]: false }));
    }
  }

  function toggleExpandir(id: string) {
    if (expandido === id) {
      setExpandido(null);
      return;
    }
    setExpandido(id);
    if (!panesPorViatura[id]) carregarPanes(id);
  }

  const filtrados = useMemo(() => viaturas.filter(v => {
    const mt = !debouncedTermo ||
      v.prefixo.toLowerCase().includes(debouncedTermo.toLowerCase()) ||
      v.placa.toLowerCase().includes(debouncedTermo.toLowerCase()) ||
      v.marca.toLowerCase().includes(debouncedTermo.toLowerCase()) ||
      v.modelo.toLowerCase().includes(debouncedTermo.toLowerCase());
    const mf = !filterTipo || v.tipo === filterTipo;
    return mt && mf;
  }), [viaturas, debouncedTermo, filterTipo]);

  // Formulário de nova pane (por viatura)
  const [novaPaneViatura, setNovaPaneViatura] = useState<string | null>(null);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);

  async function handleAdicionarPane() {
    if (!novaPaneViatura || !novaDescricao.trim()) return;
    setSaving(true);
    try {
      await criarPane({
        viaturaId: novaPaneViatura,
        descricao: novaDescricao.trim(),
        dataRegistro: novaData,
        registradoPor: username,
        status: 'Aberta',
      });
      await carregarPanes(novaPaneViatura);
      setNovaPaneViatura(null);
      setNovaDescricao('');
      setNovaData(new Date().toISOString().split('T')[0]);
    } catch {
      alert('Erro ao adicionar pane.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResolverPane(viaturaId: string, pane: ViaturaPane) {
    try {
      await atualizarPane(pane.id, {
        status: 'Resolvida',
        resolvidaEm: new Date().toISOString().split('T')[0],
        resolvidaPor: username,
      });
      await carregarPanes(viaturaId);
    } catch {
      alert('Erro ao marcar como resolvida.');
    }
  }

  async function handleExcluirPane() {
    if (!confirmDeletePane) return;
    try {
      await excluirPane(confirmDeletePane.paneId);
      await carregarPanes(confirmDeletePane.viaturaId);
    } catch {
      alert('Erro ao excluir pane.');
    } finally {
      setConfirmDeletePane(null);
    }
  }

  const tipos = useMemo(() => [...new Set(viaturas.map(v => v.tipo))], [viaturas]);

  return (
    <PageContainer>
      <div className="mb-6">
        <PageTitle icon={Truck} title="Viaturas CCI" subtitle="Monitoramento e histórico de panes das viaturas cadastradas" />
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input value={termo} onChange={e => setTermo(e.target.value)} placeholder="Pesquisar por prefixo, placa, marca..." className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm outline-none dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100" />
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-200">
          <option value="">Todos os Tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-sm text-graphite-500">{filtrados.length} viatura(s)</span>
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <Truck className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhuma viatura encontrada</h3>
          <p className="text-sm text-graphite-400">Cadastre viaturas em Cadastro &gt; Viaturas para acompanhar aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(v => {
            const panes = panesPorViatura[v.id] || [];
            const abertas = panes.filter(p => p.status === 'Aberta').length;
            return (
              <div key={v.id} className="rounded-2xl border border-graphite-200 bg-white/80 transition-all hover:shadow-md dark:border-border-dark dark:bg-surface-card">
                <button onClick={() => toggleExpandir(v.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {v.fotoUrl ? (
                      <img src={v.fotoUrl} alt={v.prefixo} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-graphite-100 to-graphite-200 dark:from-graphite-700 dark:to-graphite-800">
                        <Truck className="h-7 w-7 text-graphite-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{v.prefixo}</h3>
                        <span className="rounded-full bg-aviation-50 px-2 py-0.5 text-xs font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">{v.tipo}</span>
                        {v.tipo === 'CCI' && <span className="rounded-full bg-graphite-100 px-2 py-0.5 text-xs font-medium dark:bg-graphite-700 dark:text-graphite-300">{v.tipoCCI}</span>}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(v.status)}`}>{v.status}</span>
                        {abertas > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                            <Wrench className="h-3 w-3" /> {abertas} pane(s) aberta(s)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-graphite-500 dark:text-graphite-400">
                        {v.placa ? `Placa: ${v.placa}` : ''}{v.marca ? ` · ${v.marca} ${v.modelo}` : ''}{v.ano ? ` · ${v.ano}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-graphite-400">{panes.length} pane(s)</span>
                    {expandido === v.id ? <ChevronUp className="h-5 w-5 text-graphite-400" /> : <ChevronDown className="h-5 w-5 text-graphite-400" />}
                  </div>
                </button>

                {expandido === v.id && (
                  <div className="border-t border-graphite-200 px-4 py-4 dark:border-border-dark">
                    {/* Formulário nova pane */}
                    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-dashed border-graphite-300 bg-graphite-50/50 p-3 dark:border-border-dark dark:bg-surface-hover/20">
                      {novaPaneViatura === v.id ? (
                        <>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className={labelCls}>Descrição da pane *</label>
                              <input value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} placeholder="Ex.: Bomba não aciona" className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls}>Data</label>
                              <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} className={inputCls} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleAdicionarPane} disabled={saving || !novaDescricao.trim()} className="flex items-center gap-1 rounded-lg bg-aviation-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-aviation-700 disabled:opacity-50">
                              <Check className="h-3.5 w-3.5" /> {saving ? 'Salvando...' : 'Adicionar pane'}
                            </button>
                            <button onClick={() => { setNovaPaneViatura(null); setNovaDescricao(''); }} className="rounded-lg px-3 py-1.5 text-xs font-medium text-graphite-500 hover:bg-graphite-100 dark:hover:bg-surface-hover">
                              Cancelar
                            </button>
                          </div>
                        </>
                      ) : (
                        <button onClick={() => setNovaPaneViatura(v.id)} className="flex items-center gap-1 self-start rounded-lg border border-graphite-300 bg-white px-3 py-1.5 text-xs font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                          <Plus className="h-3.5 w-3.5" /> Adicionar pane
                        </button>
                      )}
                    </div>

                    {/* Histórico de panes */}
                    {carregandoPanes[v.id] ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-aviation-500 border-t-transparent" />
                      </div>
                    ) : panes.length === 0 ? (
                      <p className="py-4 text-center text-sm text-graphite-400">Nenhuma pane registrada nesta viatura.</p>
                    ) : (
                      <div className="space-y-2">
                        {panes.map(p => (
                          <div key={p.id} className="flex items-start justify-between gap-3 rounded-xl border border-graphite-200 bg-white p-3 dark:border-border-dark dark:bg-surface-card">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${paneColor(p.status)}`}>{p.status}</span>
                                {p.dataRegistro && <span className="text-[10px] text-graphite-400">{fmtDate(p.dataRegistro)}</span>}
                                {p.registradoPor && <span className="text-[10px] text-graphite-400">· {p.registradoPor}</span>}
                              </div>
                              <p className="mt-1 text-sm text-graphite-800 dark:text-graphite-200 whitespace-pre-wrap">{p.descricao}</p>
                              {p.status === 'Resolvida' && (
                                <p className="mt-1 text-[10px] text-green-600 dark:text-green-400">
                                  Resolvida em {fmtDate(p.resolvidaEm || '')} {p.resolvidaPor ? `por ${p.resolvidaPor}` : ''}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {p.status === 'Aberta' && (
                                <button onClick={() => handleResolverPane(v.id, p)} title="Marcar como resolvida" className="rounded-lg p-1.5 text-green-600 transition-all hover:bg-green-50 dark:hover:bg-green-900/20">
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              <button onClick={() => setConfirmDeletePane({ viaturaId: v.id, paneId: p.id })} title="Excluir pane" className="rounded-lg p-1.5 text-red-400 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmDeletePane && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Excluir pane</h3>
            <p className="mb-6 text-sm text-graphite-500">Tem certeza que deseja excluir esta pane?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeletePane(null)} className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:bg-surface-card">Cancelar</button>
              <button onClick={handleExcluirPane} className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg"><X className="mr-1 inline h-4 w-4" />Excluir</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default ViaturasCCI;
