import { useState, useEffect, useMemo } from 'react';
import { ScrollText, Plus, Trash2, Save, Clock, Users, Search } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarBombeiros } from '../../services/bombeiroService';
import type { Bombeiro } from '../../types/bombeiro';
import { CARGO_OPTIONS } from '../../types/bombeiro';

interface TempoRegistro {
  pessoaId: string;
  nomeCompleto: string;
  funcao: string;
  calcaBota: string;
  epr: string;
  tpComp: string;
  tpEpr: string;
}

interface TreinamentoTPEPR {
  id: string;
  data: string;
  createdAt: string;
  registros: TempoRegistro[];
}

const STORAGE_KEY = 'sescinc-tp-epr';

function carregar(): TreinamentoTPEPR[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function salvar(lista: TreinamentoTPEPR[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

function TempoInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-bold text-graphite-500 dark:text-graphite-400 uppercase whitespace-nowrap">{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="00:00"
        className="w-16 rounded-md border border-graphite-300 bg-white px-1.5 py-1 text-center text-xs font-bold text-graphite-900 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100" />
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

export function TPEPR() {
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [treinamentos, setTreinamentos] = useState<TreinamentoTPEPR[]>([]);
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [dataTreino, setDataTreino] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState<TempoRegistro[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listarBombeiros().then(setBombeiros).catch(() => {});
    setTreinamentos(carregar());
  }, []);

  const filtered = useMemo(() => {
    if (!search) return bombeiros;
    const t = search.toLowerCase();
    return bombeiros.filter(b => b.nomeCompleto.toLowerCase().includes(t) || b.nomeGuerra.toLowerCase().includes(t));
  }, [bombeiros, search]);

  function adicionarPessoa(b: Bombeiro) {
    if (registros.some(r => r.pessoaId === b.id)) return;
    setRegistros(prev => [...prev, {
      pessoaId: b.id,
      nomeCompleto: b.nomeCompleto,
      funcao: b.cargo,
      calcaBota: '',
      epr: '',
      tpComp: '',
      tpEpr: '',
    }]);
    setSearch('');
  }

  function removerPessoa(id: string) {
    setRegistros(prev => prev.filter(r => r.pessoaId !== id));
  }

  function atualizarTempo(pessoaId: string, campo: keyof TempoRegistro, valor: string) {
    setRegistros(prev => prev.map(r => r.pessoaId === pessoaId ? { ...r, [campo]: valor } : r));
  }

  function handleNovo() {
    setEditandoId(null);
    setDataTreino(new Date().toISOString().split('T')[0]);
    setRegistros([]);
    setMode('form');
  }

  function handleEditar(t: TreinamentoTPEPR) {
    setEditandoId(t.id);
    setDataTreino(t.data);
    setRegistros(t.registros);
    setMode('form');
  }

  function handleSalvar() {
    const lista = carregar();
    const novo: TreinamentoTPEPR = {
      id: editandoId || crypto.randomUUID(),
      data: dataTreino,
      createdAt: editandoId ? (lista.find(t => t.id === editandoId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      registros,
    };
    if (editandoId) {
      const idx = lista.findIndex(t => t.id === editandoId);
      if (idx >= 0) lista[idx] = novo;
    } else {
      lista.push(novo);
    }
    salvar(lista);
    setTreinamentos(lista);
    setMode('list');
  }

  function handleExcluir(id: string) {
    const lista = carregar().filter(t => t.id !== id);
    salvar(lista);
    setTreinamentos(lista);
  }

  return (
    <PageContainer>
      <PageTitle icon={ScrollText} title="TP/EPR" />

      {mode === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-graphite-500 dark:text-graphite-400">{treinamentos.length} treinamento(s)</p>
            <button onClick={handleNovo}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl active:scale-[0.98]">
              <Plus className="h-4 w-4" /> + TP/EPR
            </button>
          </div>

          {treinamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
              <ScrollText className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
              <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum TP/EPR registrado</h3>
              <p className="text-sm text-graphite-500">Clique em "+ TP/EPR" para registrar um novo treinamento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {treinamentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(t => (
                <div key={t.id} className="rounded-2xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-graphite-900 dark:text-graphite-100">TP/EPR - {formatDate(t.data)}</p>
                        <p className="text-xs text-graphite-500 dark:text-graphite-400">{t.registros.length} participantes</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditar(t)}
                        className="rounded-lg border border-graphite-300 bg-white px-3 py-1.5 text-xs font-medium text-graphite-700 hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                        Editar
                      </button>
                      <button onClick={() => handleExcluir(t.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'form' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setMode('list')}
                className="rounded-xl border border-graphite-300 bg-white px-3 py-2 text-sm font-medium text-graphite-700 hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Voltar
              </button>
              <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
                {editandoId ? 'Editar' : 'Novo'} TP/EPR
              </h2>
            </div>
            <button onClick={handleSalvar} disabled={registros.length === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50">
              <Save className="h-4 w-4" /> Salvar
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Data do Treinamento</label>
            <input type="date" value={dataTreino} onChange={e => setDataTreino(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100" />
          </div>

          {/* Adicionar participantes */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-graphite-700 dark:text-graphite-300">
              <Users className="h-4 w-4 text-aviation-600" /> Participantes ({registros.length})
            </label>
            <div className="relative mb-3 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar bombeiro para adicionar..."
                className="w-full rounded-xl border border-graphite-300 bg-white py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100" />
            </div>
            {search && filtered.length > 0 && (
              <div className="mb-3 max-w-md rounded-xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
                {filtered.slice(0, 8).map(b => (
                  <button key={b.id} onClick={() => adicionarPessoa(b)} disabled={registros.some(r => r.pessoaId === b.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-graphite-50 disabled:opacity-30 dark:hover:bg-surface-hover">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-aviation-500 to-aviation-700 text-xs font-bold text-white">
                      {b.nomeGuerra.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-graphite-900 dark:text-graphite-100">{b.nomeCompleto}</p>
                      <p className="text-xs text-graphite-500">{b.nomeGuerra} · {CARGO_OPTIONS.find(c => c.value === b.cargo)?.label || b.cargo}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabela de tempos */}
          {registros.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-graphite-200 bg-graphite-50 dark:border-border-dark dark:bg-graphite-900">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Nome Completo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Função</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">1° CALÇA+BOTA</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">2° EPR</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">3° TP/COMP</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">4° TP/EPR</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, idx) => (
                    <tr key={r.pessoaId} className="border-b border-graphite-100 transition-colors hover:bg-graphite-50 dark:border-border-dark dark:hover:bg-surface-hover/50">
                      <td className="px-4 py-3 text-xs font-bold text-graphite-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-graphite-900 dark:text-graphite-100">{r.nomeCompleto}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-graphite-600 dark:text-graphite-400">{CARGO_OPTIONS.find(c => c.value === r.funcao)?.label || r.funcao}</td>
                      <td className="px-4 py-3">
                        <TempoInput label="CALÇA+BOTA" value={r.calcaBota} onChange={v => atualizarTempo(r.pessoaId, 'calcaBota', v)} />
                      </td>
                      <td className="px-4 py-3">
                        <TempoInput label="EPR" value={r.epr} onChange={v => atualizarTempo(r.pessoaId, 'epr', v)} />
                      </td>
                      <td className="px-4 py-3">
                        <TempoInput label="TP/COMP" value={r.tpComp} onChange={v => atualizarTempo(r.pessoaId, 'tpComp', v)} />
                      </td>
                      <td className="px-4 py-3">
                        <TempoInput label="TP/EPR" value={r.tpEpr} onChange={v => atualizarTempo(r.pessoaId, 'tpEpr', v)} />
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => removerPessoa(r.pessoaId)}
                          className="rounded-lg p-1 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}

export default TPEPR;
