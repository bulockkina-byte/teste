import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle, Plus, Save, Eye, Pencil, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarBombeiros } from '../../services/bombeiroService';
import { listarOcorrencias, criarOcorrencia, atualizarOcorrencia, excluirOcorrencia } from '../../services/ocorrenciaService';
import { CATEGORIAS_OCORRENCIA, STATUS_OCORRENCIA, EQUIPES } from '../../types/ocorrencia';
import type { Ocorrencia } from '../../types/ocorrencia';

function emptyOcorrencia(): Omit<Ocorrencia, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  return {
    data: new Date().toISOString().split('T')[0],
    hora: '',
    equipe: '',
    turno: '',
    categoria: 'Outros',
    titulo: '',
    descricao: '',
    local: '',
    envolvidos: '',
    acoesTomadas: '',
    status: 'Aberta',
    fotos: [],
  };
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

function getUserEquipe(username: string): string {
  const b = listarBombeiros().find(
    x => x.nomeGuerra.toLowerCase() === username.toLowerCase() ||
         x.nomeCompleto.toLowerCase().includes(username.toLowerCase()),
  );
  return b?.equipe || '';
}

/* ───────── Formulário ───────── */

function OcorrenciaForm({
  ocorrencia,
  userEquipe,
  onSave,
  onCancel,
}: {
  ocorrencia?: Ocorrencia;
  userEquipe: string;
  onSave: (data: Omit<Ocorrencia, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(ocorrencia ? {
    data: ocorrencia.data, hora: ocorrencia.hora, equipe: ocorrencia.equipe,
    turno: ocorrencia.turno, categoria: ocorrencia.categoria, titulo: ocorrencia.titulo,
    descricao: ocorrencia.descricao, local: ocorrencia.local, envolvidos: ocorrencia.envolvidos,
    acoesTomadas: ocorrencia.acoesTomadas, status: ocorrencia.status, fotos: ocorrencia.fotos,
  } : { ...emptyOcorrencia(), equipe: userEquipe });

  const input = 'w-full rounded-xl border border-graphite-300/70 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-700/50 dark:bg-graphite-900/50 dark:text-graphite-100 dark:focus:border-aviation-400/50';
  const select = input;
  const label = 'block mb-1.5 text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, fotos: [...f.fotos, reader.result as string] }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 sm:pt-16">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white/95 shadow-2xl shadow-black/10 backdrop-blur-sm dark:bg-graphite-800/95">
        <div className="flex items-center justify-between border-b border-graphite-200/60 px-6 py-4 dark:border-graphite-700/50">
          <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{ocorrencia ? 'Editar Ocorrência' : 'Nova Ocorrência'}</h2>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-graphite-700">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Data *</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className={input} />
            </div>
            <div>
              <label className={label}>Hora *</label>
              <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} className={input} />
            </div>
            <div>
              <label className={label}>Equipe *</label>
              <select value={form.equipe} onChange={e => setForm(f => ({ ...f, equipe: e.target.value }))} className={select}>
                <option value="">Selecione</option>
                {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Turno</label>
              <select value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value }))} className={select}>
                <option value="">Selecione</option>
                <option value="Diurno">Diurno</option>
                <option value="Noturno">Noturno</option>
              </select>
            </div>
            <div>
              <label className={label}>Categoria *</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value as Ocorrencia['categoria'] }))} className={select}>
                {CATEGORIAS_OCORRENCIA.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Ocorrencia['status'] }))} className={select}>
                {STATUS_OCORRENCIA.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Título *</label>
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className={input} placeholder="Resumo da ocorrência" />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Local</label>
              <input value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} className={input} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Descrição</label>
              <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} className={input + ' resize-none'} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Envolvidos</label>
              <input value={form.envolvidos} onChange={e => setForm(f => ({ ...f, envolvidos: e.target.value }))} className={input} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Ações Tomadas</label>
              <textarea value={form.acoesTomadas} onChange={e => setForm(f => ({ ...f, acoesTomadas: e.target.value }))} rows={3} className={input + ' resize-none'} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Fotos</label>
              <div className="flex flex-wrap gap-2">
                {form.fotos.map((foto, i) => (
                  <div key={i} className="relative h-16 w-16">
                    <img src={foto} className="h-full w-full rounded-lg object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, fotos: f.fotos.filter((_, j) => j !== i) }))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">✕</button>
                  </div>
                ))}
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-graphite-300/60 text-graphite-400 transition-colors hover:border-aviation-400 hover:text-aviation-500">
                  <Plus className="h-5 w-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-graphite-200/60 px-6 py-4 dark:border-graphite-700/50">
          <button onClick={onCancel} className="rounded-xl border border-graphite-300/60 bg-white/80 px-5 py-2.5 text-sm font-medium text-graphite-700 dark:border-graphite-700/40 dark:bg-graphite-800/80 dark:text-graphite-200">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.titulo || !form.data || !form.equipe}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="h-4 w-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Visualização ───────── */

function OcorrenciaView({ ocorrencia, onBack }: { ocorrencia: Ocorrencia; onBack: () => void }) {
  const label = 'text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';
  const value = 'text-sm text-graphite-900 dark:text-graphite-100';

  const statusColor: Record<string, string> = {
    'Aberta': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    'Em Andamento': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    'Fechada': 'bg-status-green/10 text-status-green',
  };

  return (
    <div className="rounded-2xl border border-graphite-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-graphite-700/40 dark:bg-graphite-800/80">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{ocorrencia.titulo}</h3>
          <p className="mt-1 text-sm text-graphite-500">{ocorrencia.data} {ocorrencia.hora && `às ${ocorrencia.hora}`}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[ocorrencia.status] || ''}`}>{ocorrencia.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div><p className={label}>Equipe</p><p className={value}>{ocorrencia.equipe}</p></div>
        <div><p className={label}>Turno</p><p className={value}>{ocorrencia.turno || '—'}</p></div>
        <div><p className={label}>Categoria</p><p className={value}>{ocorrencia.categoria}</p></div>
        <div><p className={label}>Local</p><p className={value}>{ocorrencia.local || '—'}</p></div>
      </div>

      {ocorrencia.descricao && (
        <div className="mt-4"><p className={label}>Descrição</p><p className={value + ' mt-1 whitespace-pre-wrap'}>{ocorrencia.descricao}</p></div>
      )}
      {ocorrencia.envolvidos && (
        <div className="mt-3"><p className={label}>Envolvidos</p><p className={value + ' mt-1'}>{ocorrencia.envolvidos}</p></div>
      )}
      {ocorrencia.acoesTomadas && (
        <div className="mt-3"><p className={label}>Ações Tomadas</p><p className={value + ' mt-1 whitespace-pre-wrap'}>{ocorrencia.acoesTomadas}</p></div>
      )}

      {ocorrencia.fotos.length > 0 && (
        <div className="mt-4">
          <p className={label}>Fotos</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ocorrencia.fotos.map((f, i) => (
              <img key={i} src={f} className="h-20 w-20 rounded-xl object-cover" />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={onBack} className="rounded-xl border border-graphite-300/60 bg-white/80 px-5 py-2.5 text-sm font-medium text-graphite-700 dark:border-graphite-700/40 dark:bg-graphite-800/80 dark:text-graphite-200">Voltar</button>
      </div>
    </div>
  );
}

/* ───────── Card ───────── */

function OcorrenciaCard({
  o, canEdit, onView, onEdit, onDelete,
}: {
  o: Ocorrencia; canEdit: boolean;
  onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusColor: Record<string, string> = {
    'Aberta': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    'Em Andamento': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    'Fechada': 'bg-status-green/10 text-status-green',
  };

  return (
    <div className="rounded-2xl border border-graphite-200/60 bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-graphite-700/40 dark:bg-graphite-800/80">
      <button onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h4 className="truncate text-sm font-bold text-graphite-900 dark:text-graphite-100">{o.titulo}</h4>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusColor[o.status] || ''}`}>{o.status}</span>
            <span className="shrink-0 rounded-full bg-aviation-50 px-2.5 py-0.5 text-[10px] font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">{o.categoria}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-graphite-500 dark:text-graphite-400">
            <span>{o.data}</span>
            {o.hora && <span>às {o.hora}</span>}
            <span>Equipe {o.equipe}</span>
            {o.local && <span>· {o.local}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="ml-2 h-4 w-4 shrink-0 text-graphite-400" /> : <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-graphite-400" />}
      </button>

      {expanded && (
        <div className="border-t border-graphite-200/60 px-5 py-4 dark:border-graphite-700/40">
          {o.descricao && <p className="mb-2 text-sm text-graphite-700 dark:text-graphite-300 whitespace-pre-wrap">{o.descricao}</p>}
          {o.envolvidos && <p className="mb-1 text-xs text-graphite-500"><strong>Envolvidos:</strong> {o.envolvidos}</p>}
          {o.acoesTomadas && <p className="mb-2 text-xs text-graphite-500 whitespace-pre-wrap"><strong>Ações:</strong> {o.acoesTomadas}</p>}
          {o.fotos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {o.fotos.map((f, i) => <img key={i} src={f} className="h-14 w-14 rounded-lg object-cover" />)}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button onClick={onView} className="flex items-center gap-1 rounded-lg bg-aviation-50 px-3 py-1.5 text-xs font-medium text-aviation-700 transition-colors hover:bg-aviation-100 dark:bg-aviation-900/30 dark:text-aviation-300 dark:hover:bg-aviation-900/50">
              <Eye className="h-3.5 w-3.5" /> Ver
            </button>
            {canEdit && (
              <>
                <button onClick={onEdit} className="flex items-center gap-1 rounded-lg bg-graphite-100 px-3 py-1.5 text-xs font-medium text-graphite-700 transition-colors hover:bg-graphite-200 dark:bg-graphite-700 dark:text-graphite-300 dark:hover:bg-graphite-600">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button onClick={onDelete} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-alert-red transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Página principal ───────── */

export function LROOcorrencias() {
  const { user } = useAuth();
  const username = user?.username || '';
  const role = useMemo(() => getUserRole(username), [username]);
  const userEquipe = useMemo(() => getUserEquipe(username), [username]);
  const isAdmin = role === 'admin';
  const isGerente = role === 'gerente';
  const canFilterTeam = isAdmin || isGerente;
  const canEdit = isAdmin || role === 'chefe';

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [mode, setMode] = useState<'list' | 'form' | 'view'>('list');
  const [editando, setEditando] = useState<Ocorrencia | null>(null);
  const [visualizando, setVisualizando] = useState<Ocorrencia | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState((new Date().getMonth() + 1).toString());
  const [filtroEquipe, setFiltroEquipe] = useState('');
  const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const ANOS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const inputClass = 'rounded-xl border border-graphite-300/70 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-700/50 dark:bg-graphite-900/50 dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-graphite-900';

  function carregar() { setOcorrencias(listarOcorrencias()); }
  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    let list = ocorrencias;
    if (!canFilterTeam && userEquipe) {
      list = list.filter(o => o.equipe === userEquipe);
    }
    if (canFilterTeam && filtroEquipe) {
      list = list.filter(o => o.equipe === filtroEquipe);
    }
    if (filtroAno) {
      list = list.filter(o => o.data.startsWith(filtroAno));
    }
    if (filtroMes) {
      list = list.filter(o => {
        const d = new Date(o.data);
        return (d.getMonth() + 1).toString() === filtroMes;
      });
    }
    return list;
  }, [ocorrencias, canFilterTeam, userEquipe, filtroEquipe, filtroAno, filtroMes]);

  function handleSave(data: Omit<Ocorrencia, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) {
    if (editando && editando.id) {
      atualizarOcorrencia(editando.id, data);
    } else {
      criarOcorrencia({ ...data, createdBy: username });
    }
    carregar();
    setEditando(null);
    setMode('list');
  }

  function handleDelete(id: string) {
    excluirOcorrencia(id);
    setConfirmDelete(null);
    carregar();
  }

  if (mode === 'form') {
    return (
      <PageContainer>
        <PageTitle icon={AlertCircle} title={editando ? 'Editar Ocorrência' : 'Nova Ocorrência'} />
        <OcorrenciaForm ocorrencia={editando || undefined} userEquipe={userEquipe} onSave={handleSave} onCancel={() => { setMode('list'); setEditando(null); }} />
      </PageContainer>
    );
  }

  if (mode === 'view' && visualizando) {
    return (
      <PageContainer>
        <PageTitle icon={AlertCircle} title="Ocorrência" />
        <OcorrenciaView ocorrencia={visualizando} onBack={() => setMode('list')} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageTitle icon={AlertCircle} title="LRO/Ocorrências" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className={inputClass}>
            <option value="">Todos os anos</option>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={inputClass}>
            <option value="">Todos os meses</option>
            {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          {canFilterTeam && (
            <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)} className={inputClass}>
              <option value="">Todas as equipes</option>
              {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          )}
          <p className="text-sm text-graphite-500 dark:text-graphite-400">{filtradas.length} ocorrência(s)</p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditando(null); setMode('form'); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Nova Ocorrência
          </button>
        )}
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-graphite-700/40 dark:bg-graphite-900/30">
          <AlertCircle className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhuma ocorrência encontrada</h3>
          <p className="text-sm text-graphite-400">Clique em "Nova Ocorrência" para registrar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(o => (
            <OcorrenciaCard key={o.id} o={o} canEdit={canEdit}
              onView={() => { setVisualizando(o); setMode('view'); }}
              onEdit={() => { setEditando(o); setMode('form'); }}
              onDelete={() => setConfirmDelete(o.id)}
            />
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-xl shadow-black/5 backdrop-blur-sm dark:bg-graphite-800/95 dark:shadow-black/20">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500">Tem certeza que deseja excluir esta ocorrência?</p>
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
