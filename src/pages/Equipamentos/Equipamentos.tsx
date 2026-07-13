import { useState, useEffect, useMemo } from 'react';
import {
  Wrench, Search, Plus, Pencil, Trash2, X, Upload, AlertCircle,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import {
  listarEquipamentos, criarEquipamento, atualizarEquipamento, excluirEquipamento,
} from '../../services/equipamentoService';
import {
  CATEGORIA_OPTIONS, STATUS_OPTIONS,
} from '../../types/equipamento';
import type { Equipamento, CategoriaEquipamento, StatusEquipamento } from '../../types/equipamento';
import { useDebounce } from '../../hooks/useDebounce';

const INPUT_CLASS = 'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100';
const LABEL_CLASS = 'block mb-1.5 text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';

const EMPTY: Omit<Equipamento, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
  nome: '',
  descricao: '',
  categoria: 'desencarcerador',
  marca: '',
  modelo: '',
  numeroSerie: '',
  dataAquisicao: '',
  dataValidade: '',
  vidaUtilMeses: '',
  responsavel: '',
  localizacao: '',
  status: 'Operacional',
  fotoUrl: '',
  observacoes: '',
};

function getCategoriaIcon(cat: CategoriaEquipamento) {
  const map: Record<CategoriaEquipamento, any> = {
    desencarcerador: Shield,
    penetracao_fuselagem: Zap,
    serra_circular: WrenchIcon,
    almofada_pneumatica: Tag,
    lge: Droplets,
    pqs: Flame,
    mangueira_pressao: Droplets,
    canhao_monitor: Shield,
    prancha_imobilizacao: Heart,
    maleta_trauma: Heart,
    dea: Zap,
  };
  return map[cat] || Wrench;
}

export function Equipamentos() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';

  const [lista, setLista] = useState<Equipamento[]>([]);
  const [termo, setTermo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<CategoriaEquipamento | ''>('');
  const [filterStatus, setFilterStatus] = useState<StatusEquipamento | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Equipamento | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const debouncedTermo = useDebounce(termo, 400);

  useEffect(() => { setLista(listarEquipamentos()); }, []);

  const filtrados = useMemo(() => {
    return lista.filter(e => {
      const matchTermo = !debouncedTermo ||
        e.nome.toLowerCase().includes(debouncedTermo.toLowerCase()) ||
        e.marca.toLowerCase().includes(debouncedTermo.toLowerCase()) ||
        e.modelo.toLowerCase().includes(debouncedTermo.toLowerCase()) ||
        e.numeroSerie.toLowerCase().includes(debouncedTermo.toLowerCase());
      const matchCat = !filterCategoria || e.categoria === filterCategoria;
      const matchStatus = !filterStatus || e.status === filterStatus;
      return matchTermo && matchCat && matchStatus;
    });
  }, [lista, debouncedTermo, filterCategoria, filterStatus]);

  function openNew() {
    setEditando(null);
    setForm(EMPTY);
    setFormOpen(true);
  }

  function openEdit(v: Equipamento) {
    setEditando(v);
    setForm({
      nome: v.nome, descricao: v.descricao, categoria: v.categoria,
      marca: v.marca, modelo: v.modelo, numeroSerie: v.numeroSerie,
      dataAquisicao: v.dataAquisicao, dataValidade: v.dataValidade,
      vidaUtilMeses: v.vidaUtilMeses, responsavel: v.responsavel,
      localizacao: v.localizacao, status: v.status,
      fotoUrl: v.fotoUrl, observacoes: v.observacoes,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editando) {
        atualizarEquipamento(editando.id, form);
      } else {
        criarEquipamento({ ...form, createdBy: user?.username || '' });
      }
      setFormOpen(false);
      setLista(listarEquipamentos());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    excluirEquipamento(id);
    setConfirmDelete(null);
    setLista(listarEquipamentos());
  }

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleFileUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => updateField('fotoUrl', reader.result as string);
    reader.readAsDataURL(file);
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    lista.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return counts;
  }, [lista]);

  const catInfo = (cat: CategoriaEquipamento) => CATEGORIA_OPTIONS.find(c => c.value === cat);

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle icon={Wrench} title="Equipamentos — Bombeiro de Aeródromo" />
        {isAdmin && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-aviation-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-aviation-700 dark:bg-aviation-500 dark:hover:bg-aviation-600">
            <Plus className="h-4 w-4" /> Novo Equipamento
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(s => (
          <span key={s.value} className={`rounded-full px-3 py-1 text-xs font-bold ${s.color}`}>
            {s.label}: {statusCounts[s.value] || 0}
          </span>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input type="text" value={termo} onChange={e => setTermo(e.target.value)}
            placeholder="Pesquisar por nome, marca, modelo, nº série..."
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100" />
        </div>
        <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value as CategoriaEquipamento | '')}
          className="rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm text-graphite-700 outline-none dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-200">
          <option value="">Todas as categorias</option>
          {CATEGORIA_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as StatusEquipamento | '')}
          className="rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm text-graphite-700 outline-none dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-200">
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="mb-4 text-sm text-graphite-500 dark:text-graphite-400">
        <strong className="text-graphite-700 dark:text-graphite-200">{filtrados.length}</strong> equipamento(s)
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <Wrench className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum equipamento encontrado</h3>
          <p className="text-sm text-graphite-400">{isAdmin ? 'Clique em "Novo Equipamento" para cadastrar.' : 'Nenhum equipamento cadastrado.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(v => {
            const info = catInfo(v.categoria);
            const Icon = getCategoriaIcon(v.categoria);
            const statusOpt = STATUS_OPTIONS.find(s => s.value === v.status);
            return (
              <div key={v.id} className="rounded-2xl border border-graphite-200/60 bg-white/80 p-4 transition-all hover:shadow-md dark:border-border-dark dark:bg-surface-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {v.fotoUrl ? (
                      <img src={v.fotoUrl} alt={v.nome} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${info?.cor || 'from-graphite-400 to-graphite-500'} text-white`}>
                        <Icon className="h-7 w-7" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-graphite-900 dark:text-graphite-100">{v.nome}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white bg-gradient-to-br ${info?.cor || 'from-graphite-400 to-graphite-500'}`}>
                          {info?.label || v.categoria}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusOpt?.color || ''}`}>{v.status}</span>
                      </div>
                      <p className="text-sm text-graphite-500 dark:text-graphite-400">
                        {v.marca ? `${v.marca} ${v.modelo}` : ''}{v.numeroSerie ? ` · S/N: ${v.numeroSerie}` : ''}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-graphite-400 dark:text-graphite-500">
                        {v.localizacao && <span>📍 {v.localizacao}</span>}
                        {v.responsavel && <span>👤 {v.responsavel}</span>}
                        {v.dataValidade && <span>📅 Validade: {new Date(v.dataValidade + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => openEdit(v)} className="rounded-lg p-1.5 text-graphite-400 transition-colors hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(v.id)} className="rounded-lg p-1.5 text-graphite-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {v.descricao && (
                  <p className="mt-2 text-xs text-graphite-500 dark:text-graphite-400 line-clamp-2">{v.descricao}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-5 pb-5" onClick={() => setFormOpen(false)}>
          <div className="relative w-full max-w-3xl rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur-sm dark:bg-surface-elevated/95 dark:shadow-black/20" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{editando ? 'Editar Equipamento' : 'Novo Equipamento'}</h3>
              <button onClick={() => setFormOpen(false)} className="rounded-xl p-1.5 text-graphite-400 hover:bg-graphite-100 dark:hover:bg-surface-hover"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={LABEL_CLASS}>Nome *</label>
                  <input type="text" value={form.nome} onChange={e => updateField('nome', e.target.value)} className={INPUT_CLASS} placeholder="Ex: Desencarcerador Hurst Jaws of Life" />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Categoria *</label>
                  <select value={form.categoria} onChange={e => updateField('categoria', e.target.value as CategoriaEquipamento)} className={INPUT_CLASS}>
                    {CATEGORIA_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>Descrição</label>
                <textarea value={form.descricao} onChange={e => updateField('descricao', e.target.value)} className={INPUT_CLASS} rows={2} placeholder="Descrição do equipamento..." />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className={LABEL_CLASS}>Marca</label>
                  <input type="text" value={form.marca} onChange={e => updateField('marca', e.target.value)} className={INPUT_CLASS} placeholder="Ex: Hurst, Holmatro" />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Modelo</label>
                  <input type="text" value={form.modelo} onChange={e => updateField('modelo', e.target.value)} className={INPUT_CLASS} placeholder="Ex: eDRAULIC 5.0" />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Nº Série</label>
                  <input type="text" value={form.numeroSerie} onChange={e => updateField('numeroSerie', e.target.value)} className={INPUT_CLASS} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className={LABEL_CLASS}>Data de Aquisição</label>
                  <input type="date" value={form.dataAquisicao} onChange={e => updateField('dataAquisicao', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Data de Validade</label>
                  <input type="date" value={form.dataValidade} onChange={e => updateField('dataValidade', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Vida Útil (meses)</label>
                  <input type="text" value={form.vidaUtilMeses} onChange={e => updateField('vidaUtilMeses', e.target.value)} className={INPUT_CLASS} placeholder="Ex: 60" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className={LABEL_CLASS}>Status</label>
                  <select value={form.status} onChange={e => updateField('status', e.target.value as StatusEquipamento)} className={INPUT_CLASS}>
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Responsável</label>
                  <input type="text" value={form.responsavel} onChange={e => updateField('responsavel', e.target.value)} className={INPUT_CLASS} placeholder="Nome do responsável" />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Localização</label>
                  <input type="text" value={form.localizacao} onChange={e => updateField('localizacao', e.target.value)} className={INPUT_CLASS} placeholder="Ex: CCI-01, Hangar" />
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>Foto do Equipamento</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-graphite-300 bg-graphite-50 px-4 py-3 text-sm text-graphite-500 transition-colors hover:border-aviation-400 hover:bg-aviation-50 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-400">
                  <Upload className="h-4 w-4" />
                  {form.fotoUrl ? 'Trocar imagem' : 'Selecionar imagem'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                </label>
                {form.fotoUrl && <img src={form.fotoUrl} alt="Preview" className="mt-2 h-20 w-20 rounded-lg object-cover" />}
              </div>

              <div>
                <label className={LABEL_CLASS}>Observações</label>
                <textarea value={form.observacoes} onChange={e => updateField('observacoes', e.target.value)} className={INPUT_CLASS} rows={2} placeholder="Observações adicionais..." />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setFormOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-graphite-600 transition-colors hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.nome} className="rounded-xl bg-aviation-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-aviation-700 disabled:opacity-50 dark:bg-aviation-500 dark:hover:bg-aviation-600">
                {saving ? 'Salvando...' : editando ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur-sm dark:bg-surface-elevated/95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-alert-red" />
              <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar Exclusão</h3>
            </div>
            <p className="text-sm text-graphite-600 dark:text-graphite-400 mb-6">Tem certeza que deseja excluir este equipamento? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-xl px-4 py-2 text-sm font-medium text-graphite-600 hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="rounded-xl bg-alert-red px-4 py-2 text-sm font-medium text-white hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default Equipamentos;
