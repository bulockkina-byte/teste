import { useState, useEffect, useMemo } from 'react';
import { FileText, Save, Send, Eye, AlertTriangle, ArrowLeft, ArrowRight, Trash2, Search } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarAtivos } from '../../services/bombeiroService';
import { listarFeriasGozo } from '../../services/feriasService';
import { listarSubstituicoesTemporarias } from '../../services/substituicaoTemporariaService';
import { listarViaturas } from '../../services/viaturaService';
import { listarPTRBs } from '../../services/ptrbService';
import { salvarDraft, listarDrafts, atualizarStatus, excluirDraft, type LRODraft, type LRODraftStatus } from '../../services/lroDraftService';
import { gerarPDF } from '../../services/lroGenerator';
import type { Bombeiro } from '../../types/bombeiro';
import type { FeriasGozo } from '../../types/ferias';
import type { PTRB } from '../../types/ptrb';

function SearchSelect({ options, value, onChange, placeholder, label }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(o => o.value === value);

  return (
    <div className="relative">
      {label && <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">{label}</label>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
        <input
          type="text"
          value={open ? search : selected?.label || ''}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder || 'Digite para buscar...'}
          className="w-full rounded-xl border border-graphite-300 bg-white py-2.5 pl-10 pr-4 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400 dark:focus:ring-aviation-400/10"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-graphite-200 bg-white shadow-lg dark:border-border-dark dark:bg-surface-card">
          {filtered.map(o => (
            <button
              key={o.value}
              onMouseDown={() => { onChange(o.value); setSearch(''); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-aviation-50 dark:hover:bg-aviation-900/20 ${value === o.value ? 'bg-aviation-50 font-medium text-aviation-700 dark:bg-aviation-900/20 dark:text-aviation-400' : 'text-graphite-700 dark:text-graphite-300'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-graphite-200 bg-white p-3 text-center text-sm text-graphite-400 shadow-lg dark:border-border-dark dark:bg-surface-card">
          Nenhum resultado encontrado
        </div>
      )}
    </div>
  );
}

type EquipeOpcao = 'Alfa' | 'Bravo' | 'Charlie' | 'Delta';
type Step = 'equipe' | 'trocas' | 'preencher' | 'revisar';

const STATUS_CORES: Record<LRODraftStatus, string> = {
  rascunho: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  aguardando: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  assinado: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
  cancelado: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
};

const STATUS_LABELS: Record<LRODraftStatus, string> = {
  rascunho: 'Rascunho',
  aguardando: 'Aguardando Assinatura',
  assinado: 'Assinado',
  cancelado: 'Cancelado',
};

export function GerarLRO() {
  const { user } = useAuth();
  const username = user?.username || '';

  const [step, setStep] = useState<Step>('equipe');
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [todasSubstituicoes, setTodasSubstituicoes] = useState<any[]>([]);
  const [viaturas, setViaturas] = useState<any[]>([]);
  const [ptrbs, setPtrbs] = useState<PTRB[]>([]);
  const [drafts, setDrafts] = useState<LRODraft[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // -- Frota state --
  const [frotaDados, setFrotaDados] = useState<Record<string, { kmIni: string; kmFim: string; combIni: string; combFim: string; situacao: string }>>({});

  // -- Wizard state --
  const [equipe, setEquipe] = useState<EquipeOpcao>('Alfa');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState('');
  const [houveTrocas, setHouveTrocas] = useState<'sim' | 'nao' | null>(null);
  const [trocaSolicitante, setTrocaSolicitante] = useState('');
  const [trocaSolicitado, setTrocaSolicitado] = useState('');

  // -- LRO Sections --
  const [chefeEquipe, setChefeEquipe] = useState('');
  const [comunicacao, setComunicacao] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [centralFaisca, setCentralFaisca] = useState('');
  const [radioComunicacao, setRadioComunicacao] = useState('');
  const [tpTexto, setTpTexto] = useState('');
  const [extTexto, setExtTexto] = useState('');
  const [equipTexto, setEquipTexto] = useState('');
  const [edifTexto, setEdifTexto] = useState('');
  const [emergenciaXI, setEmergenciaXI] = useState('');
  const [outrasOcorrencias, setOutrasOcorrencias] = useState('');
  const [solicitacoesCCR, setSolicitacoesCCR] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';
  const [view, setView] = useState<'lista' | 'wizard'>('lista');
  const [showConfirm, setShowConfirm] = useState(false);
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroEquipeLista, setFiltroEquipeLista] = useState('');
  const [cloneOrigem, setCloneOrigem] = useState<LRODraft | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [b, f, subs, v, p] = await Promise.all([
          listarAtivos(), listarFeriasGozo(), listarSubstituicoesTemporarias(), listarViaturas(), listarPTRBs(),
        ]);
        setBombeiros(b);
        setFeriasGozo(f);
        setTodasSubstituicoes(subs);
        setViaturas(v);
        setPtrbs(p);
        const d = isAdmin
          ? await listarDrafts('').catch(() => [])
          : await listarDrafts(username).catch(() => []);
        setDrafts(d);

        const cci = v.filter((a: any) => a.tipo === 'CCI');
        const frotaInit: Record<string, any> = {};
        cci.forEach((veiculo: any) => { frotaInit[veiculo.id || veiculo.prefixo] = { kmIni: '', kmFim: '', combIni: '', combFim: '', situacao: '' }; });
        setFrotaDados(frotaInit);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [username]);

  // Auto-detect substitutions when team changes
  useEffect(() => {
    const subsEquipe = todasSubstituicoes.filter((s: any) =>
      s.status === 'Aprovada' && (s.equipe === equipe || s.funcionario_equipe === equipe)
    );
    if (subsEquipe.length > 0) {
      setHouveTrocas('sim');
      setTrocaSolicitante(subsEquipe[0].funcionario_nome || subsEquipe[0].substituto_nome || '');
      setTrocaSolicitado(subsEquipe[0].substituto_nome || subsEquipe[0].funcionario_nome || '');
    }
  }, [equipe, todasSubstituicoes]);

  // Auto-pull instructions from PTR-BA when team/date changes
  useEffect(() => {
    const ptrbsFiltrados = ptrbs.filter(p =>
      p.equipe === equipe && p.data && p.data.startsWith(dataInicio)
    );
    if (ptrbsFiltrados.length > 0) {
      const linhas = ptrbsFiltrados.map(p =>
        `${p.assuntoMinistrado || p.descricao}${p.horaInicio ? ` (${p.horaInicio})` : ''}`
      );
      setInstrucoes(linhas.join('\n'));
    }
  }, [equipe, dataInicio, ptrbs]);

  useEffect(() => {
    if (equipe === 'Bravo' || equipe === 'Delta') {
      const inicio = new Date(dataInicio + 'T19:00:00');
      const fim = new Date(inicio.getTime() + 12 * 60 * 60 * 1000);
      setDataFim(fim.toISOString().split('T')[0]);
    } else {
      setDataFim(dataInicio);
    }
  }, [equipe, dataInicio]);

  const horarioPlantao = equipe === 'Bravo' || equipe === 'Delta'
    ? { inicio: '19:00', fim: '07:00', tipo: 'noturno (12h)' }
    : { inicio: '07:00', fim: '19:00', tipo: 'diurno (12h)' };

  const membrosEquipe = useMemo(() => {
    return bombeiros.filter(b => b.equipe === equipe && !b.dataDesligamento);
  }, [bombeiros, equipe]);

  const emFerias = useMemo(() => {
    return feriasGozo.filter(f => f.equipe === equipe && f.status === 'Em Gozo');
  }, [feriasGozo, equipe]);

  const disponiveis = useMemo(() => {
    const feriasIds = new Set(emFerias.map(f => f.funcionarioId));
    return membrosEquipe.filter(b => !feriasIds.has(b.id));
  }, [membrosEquipe, emFerias]);

  const substituicoesMap = useMemo(() => {
    const map: Record<string, { substitutoNome: string; substitutoId: string }> = {};
    todasSubstituicoes
      .filter((s: any) => s.status === 'Aprovada' || s.status === 'Pendente')
      .forEach((s: any) => {
        const id = s.funcionario_id || s.funcionarioId;
        if (id) map[id] = { substitutoNome: s.substituto_nome || s.substitutoNome || '', substitutoId: s.substituto_id || s.substitutoId || '' };
      });
    return map;
  }, [todasSubstituicoes]);

  async function handleSalvarRascunho() {
    setSaving(true);
    try {
      const dados = {
        equipeNome: equipe,
        dataInicio, dataFim,
        chefeEquipe, comunicacao,
        instrucoes: instrucoes.split('\n').filter(Boolean),
        frota: viaturas.filter((v: any) => v.tipo === 'CCI').map((v: any) => {
          const key = v.id || v.prefixo || v.nome;
          const d = frotaDados[key] || {};
          return { viatura: v.prefixo || v.nome, prefixo: v.prefixo || '', kmIni: d.kmIni || '', kmFim: d.kmFim || '', combIni: d.combIni || '', combFim: d.combFim || '', situacao: d.situacao || '' };
        }),
        centralFaisca, radioComunicacao,
        tpStatus: tpTexto ? '✅ ABAIXO' : '☐ ABAIXO',
        tpTexto,
        extStatus: extTexto ? '✅ ABAIXO' : '☐ ABAIXO',
        extTexto,
        equipStatus: equipTexto ? '✅ ABAIXO' : '☐ ABAIXO',
        equipTexto,
        edifStatus: edifTexto ? '✅ ABAIXO' : '☐ ABAIXO',
        edifTexto,
        emergenciaXI,
        ocorrenciasXII: outrasOcorrencias.split('\n').filter(Boolean),
        solicitacoes: solicitacoesCCR.split('\n').filter(Boolean),
        substituicao: houveTrocas === 'sim' ? [{ funcao1: 'BA-2', nome1: trocaSolicitante, funcao2: 'BA-2', nome2: trocaSolicitado }] : [],
        cci2: [], cci3: [], crs: [],
        dataAssinatura: new Date().toLocaleDateString('pt-BR'),
        chefeAssinatura: chefeEquipe,
        gerenteAssinatura: '',
        coordenadorAssinatura: '',
      };
      const saved = await salvarDraft(dados, equipe, dataInicio, username, draftId || undefined);
      setDraftId(saved.id);
      const updated = await listarDrafts(username).catch(() => []);
      setDrafts(updated);
    } catch (err) {
      console.error('Erro ao salvar:', err);
    }
    setSaving(false);
  }

  async function handleGerarLRO() {
    setSaving(true);
    try {
      const dados = {
        equipeNome: equipe,
        dataInicio, dataFim,
        chefeEquipe, comunicacao,
        frota: viaturas.filter((v: any) => v.tipo === 'CCI').map((v: any) => {
          const key = v.id || v.prefixo || v.nome;
          const d = frotaDados[key] || {};
          return { viatura: v.prefixo || v.nome, prefixo: v.prefixo || '', kmIni: d.kmIni || '', kmFim: d.kmFim || '', combIni: d.combIni || '', combFim: d.combFim || '', situacao: d.situacao || '' };
        }),
        instrucoes: instrucoes.split('\n').filter(Boolean),
        centralFaisca: centralFaisca || 'SEM ALTERAÇÕES',
        radioComunicacao: radioComunicacao || 'SEM ALTERAÇÕES',
        tpTexto, extTexto, equipTexto, edifTexto,
        emergenciaXI,
        ocorrenciasXII: outrasOcorrencias.split('\n').filter(Boolean),
        solicitacoes: solicitacoesCCR.split('\n').filter(Boolean),
        substituicao: houveTrocas === 'sim' ? [{ funcao1: 'BA-2', nome1: trocaSolicitante, funcao2: 'BA-2', nome2: trocaSolicitado }] : [],
        cci2: [], cci3: [], crs: [],
        dataAssinatura: new Date().toLocaleDateString('pt-BR'),
        chefeAssinatura: chefeEquipe,
      };

      if (draftId) {
        await salvarDraft(dados, equipe, dataInicio, username, draftId);
      }
      const blob = await gerarPDF(dados);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Erro ao gerar LRO:', err);
    }
    setSaving(false);
  }

  async function handleEnviarAutentique() {
    setShowConfirm(false);
    setSaving(true);
    try {
      if (draftId) await atualizarStatus(draftId, 'aguardando');
    } catch { /* ignore */ }
    setSaving(false);
  }

  if (loading) return (
    <PageContainer>
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
      </div>
    </PageContainer>
  );

  if (view === 'lista') {
    const anos = [...new Set(drafts.map(d => d.data_plantao?.substring(0, 4)).filter(Boolean))].sort().reverse();
    if (anos.length === 0) anos.push(new Date().getFullYear().toString());

    const filtradas = drafts.filter(d => {
      if (filtroAno && !d.data_plantao?.startsWith(filtroAno)) return false;
      if (filtroMes && d.data_plantao) {
        const mes = d.data_plantao.substring(5, 7);
        if (mes !== filtroMes) return false;
      }
      if (filtroEquipeLista && d.equipe !== filtroEquipeLista) return false;
      return true;
    });

    return (
      <PageContainer>
        <div className="mb-6 flex items-center justify-between">
          <PageTitle icon={FileText} title="LRO - Livro Ata de Chefe de Equipe" />
          <div className="flex gap-3">
            <button onClick={() => setCloneOrigem({ id: 'novo', equipe: '', data_plantao: '', status: 'rascunho', dados: {}, created_by: username, created_at: '', updated_at: '', expires_at: '' } as any)}
              className="flex items-center gap-2 rounded-xl border border-aviation-300 bg-white px-4 py-2.5 text-sm font-medium text-aviation-700 transition-all hover:bg-aviation-50 dark:border-aviation-700 dark:bg-transparent dark:text-aviation-400">
              <FileText className="h-4 w-4" /> Clonar LRO
            </button>
            <button onClick={() => { setDraftId(null); setStep('equipe'); setView('wizard'); }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
              <FileText className="h-4 w-4" /> Novo LRO
            </button>
          </div>
        </div>

        {/* Filtros */}
        {drafts.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-3">
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="rounded-xl border border-graphite-300 bg-white px-3 py-2 text-xs text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300">
              <option value="">Todos os anos</option>
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="rounded-xl border border-graphite-300 bg-white px-3 py-2 text-xs text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300">
              <option value="">Todos os meses</option>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select value={filtroEquipeLista} onChange={e => setFiltroEquipeLista(e.target.value)} className="rounded-xl border border-graphite-300 bg-white px-3 py-2 text-xs text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300">
              <option value="">Todas as equipes</option>
              <option value="Alfa">Alfa</option>
              <option value="Bravo">Bravo</option>
              <option value="Charlie">Charlie</option>
              <option value="Delta">Delta</option>
            </select>
            <span className="self-center text-xs text-graphite-400">{filtradas.length} registro(s)</span>
          </div>
        )}

        {filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-16 text-center dark:border-border-dark dark:bg-surface-card">
            <FileText className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
            <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum LRO encontrado</h3>
            <p className="text-sm text-graphite-400">Clique em "Novo LRO" para criar o primeiro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-2xl border border-graphite-200 bg-white p-4 transition-all hover:shadow-md dark:border-border-dark dark:bg-surface-card">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${d.status === 'assinado' ? 'bg-green-100 dark:bg-green-900/30' : d.status === 'aguardando' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-graphite-100 dark:bg-graphite-800'}`}>
                    <FileText className={`h-5 w-5 ${d.status === 'assinado' ? 'text-green-600 dark:text-green-400' : d.status === 'aguardando' ? 'text-amber-600 dark:text-amber-400' : 'text-graphite-500'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-graphite-900 dark:text-graphite-100">LRO - Equipe {d.equipe}</p>
                    <p className="text-xs text-graphite-500">{d.data_plantao} · {new Date(d.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${STATUS_CORES[d.status] || STATUS_CORES.rascunho}`}>
                    {STATUS_LABELS[d.status] || d.status}
                  </span>
                  <button onClick={() => { setDraftId(d.id); setView('wizard'); }}
                    className="rounded-lg border border-graphite-200 px-3 py-1.5 text-xs font-medium text-graphite-600 transition-all hover:bg-graphite-50 dark:border-border-dark dark:hover:bg-surface-hover">
                    {d.status === 'rascunho' ? 'Continuar' : 'Visualizar'}
                  </button>
                  <button onClick={() => setCloneOrigem(d)} title="Clonar LRO"
                    className="rounded-lg p-1.5 text-graphite-400 transition-all hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover">
                    <FileText className="h-4 w-4" />
                  </button>
                  {(d.status === 'rascunho' || isAdmin) && (
                    <button onClick={() => excluirDraft(d.id).then(() => setDrafts(prev => prev.filter(x => x.id !== d.id)))}
                      className="rounded-lg p-1.5 text-alert-red transition-all hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de clonagem */}
        {cloneOrigem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-card">
              <h3 className="mb-4 text-lg font-bold text-graphite-900 dark:text-graphite-100">Clonar LRO</h3>
              <div className="grid gap-3">
                {cloneOrigem.id === 'novo' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Selecione o LRO para clonar</label>
                    <select id="cloneOrigemSelect" className="w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm dark:border-border-dark dark:bg-surface-card">
                      <option value="">Selecione...</option>
                      {drafts.map(d => (
                        <option key={d.id} value={d.id}>Equipe {d.equipe} - {d.data_plantao}</option>
                      ))}
                    </select>
                  </div>
                )}
                {cloneOrigem.id !== 'novo' && (
                  <p className="text-sm text-graphite-500">Clonar LRO da equipe <strong>{cloneOrigem.equipe}</strong> do dia <strong>{new Date(cloneOrigem.data_plantao).toLocaleDateString('pt-BR')}</strong></p>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Nova equipe</label>
                  <select id="cloneEquipe" className="w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm dark:border-border-dark dark:bg-surface-card">
                    {['Alfa','Bravo','Charlie','Delta'].map(e => <option key={e} value={e} selected={e === cloneOrigem.equipe}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Nova data</label>
                  <input id="cloneData" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm dark:border-border-dark dark:bg-surface-card" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setCloneOrigem(null)} className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">Cancelar</button>
                <button onClick={async () => {
                  const selCloneId = cloneOrigem.id === 'novo'
                    ? (document.getElementById('cloneOrigemSelect') as HTMLSelectElement)?.value
                    : cloneOrigem.id;
                  if (!selCloneId) return;
                  const origem = selCloneId === cloneOrigem.id ? cloneOrigem : drafts.find(d => d.id === selCloneId);
                  if (!origem) return;
                  const selEquipe = (document.getElementById('cloneEquipe') as HTMLSelectElement)?.value || origem.equipe;
                  const selData = (document.getElementById('cloneData') as HTMLInputElement)?.value || new Date().toISOString().split('T')[0];
                  const frota = origem.dados?.frota as Array<Record<string, string>> | undefined;
                  const frotaClone = frota?.map(f => ({
                    ...f,
                    combIni: f.combFim || '',
                    kmIni: f.kmFim || '',
                    kmFim: '', combFim: '', situacao: '',
                  })) || [];
                  const novosDados = {
                    ...origem.dados,
                    equipeNome: selEquipe,
                    dataInicio: selData,
                    dataFim: selData,
                    frota: frotaClone,
                    substituicao: [],
                    emergenciaXI: '',
                    ocorrenciasXII: [],
                    solicitacoes: [],
                  };
                  const saved = await salvarDraft(novosDados, selEquipe, selData, username);
                  const d = isAdmin
                    ? await listarDrafts('').catch(() => [])
                    : await listarDrafts(username).catch(() => []);
                  setDrafts(d);
                  setDraftId(saved.id);
                  setView('wizard');
                  setStep('preencher');
                  setCloneOrigem(null);
                }} className="rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white">Clonar</button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    );
  }

  const inputClass = 'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400 dark:focus:ring-aviation-400/10';

  return (
    <PageContainer>
      <div className="mb-6">
        <button onClick={() => setView('lista')} className="mb-4 flex items-center gap-1 text-sm text-graphite-500 hover:text-graphite-700 dark:hover:text-graphite-300">
          <ArrowLeft className="h-4 w-4" /> Voltar para lista
        </button>
        <PageTitle icon={FileText} title={`Novo LRO - ${step === 'equipe' ? 'Equipe' : step === 'trocas' ? 'Trocas' : step === 'preencher' ? 'Preencher' : 'Revisar'}`} />
      </div>

      {/* Steps indicator */}
      <div className="mb-6 flex items-center gap-2">
        {(['equipe', 'trocas', 'preencher', 'revisar'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step === s ? 'bg-aviation-600 text-white' : 'bg-graphite-100 text-graphite-500 dark:bg-graphite-800'}`}>{i + 1}</div>
            <span className={`text-xs font-medium ${step === s ? 'text-aviation-600 dark:text-aviation-400' : 'text-graphite-400'}`}>
              {s === 'equipe' ? 'Equipe' : s === 'trocas' ? 'Trocas' : s === 'preencher' ? 'Dados' : 'Revisão'}
            </span>
            {i < 3 && <div className="h-px w-8 bg-graphite-300 dark:bg-graphite-600" />}
          </div>
        ))}
      </div>

      {step === 'equipe' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-4 text-lg font-bold text-graphite-900 dark:text-graphite-100">Selecionar Equipe e Data</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Equipe *</label>
                <select value={equipe} onChange={e => setEquipe(e.target.value as EquipeOpcao)} className={inputClass}>
                  <option value="Alfa">Alfa</option>
                  <option value="Bravo">Bravo</option>
                  <option value="Charlie">Charlie</option>
                  <option value="Delta">Delta</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Data Início *</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Data Fim</label>
                <input type="date" value={dataFim} disabled className={inputClass + ' cursor-not-allowed opacity-60'} />
                <p className="mt-1 text-[11px] text-aviation-500">Plantão {horarioPlantao.tipo} — {horarioPlantao.inicio} às {horarioPlantao.fim}{equipe === 'Bravo' || equipe === 'Delta' ? ' — data fim gerada automaticamente' : ''}</p>
              </div>
            </div>
          </div>

          {/* Team members */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-4 text-lg font-bold text-graphite-900 dark:text-graphite-100">
              Efetivo da Equipe {equipe}
              <span className="ml-2 text-sm font-normal text-graphite-500">({disponiveis.length} disponíveis)</span>
            </h3>
            {emFerias.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-400">
                <span className="font-semibold">Em férias:</span> {emFerias.map(f => f.funcionarioNome).join(', ')}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {disponiveis.map(b => {
                const sub = substituicoesMap[b.id];
                return (
                  <div key={b.id} className={`group relative rounded-xl border p-2 text-center transition-all ${sub ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/10' : 'border-graphite-100 bg-graphite-50/50 dark:border-border-dark dark:bg-surface-hover/30'}`}>
                    {sub && (
                      <>
                        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] text-white shadow" title="Substituição">↔</div>
                        <div className="transition-opacity duration-200 group-hover:opacity-0">
                          <p className="text-xs font-bold text-graphite-900 dark:text-graphite-100">{b.nomeGuerra}</p>
                          <p className="text-[10px] text-graphite-500">{b.cargo}</p>
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">↔ {sub.substitutoNome}</p>
                          <p className="text-[10px] text-amber-500">substituindo</p>
                        </div>
                      </>
                    )}
                    {!sub && (
                      <>
                        <p className="text-xs font-bold text-graphite-900 dark:text-graphite-100">{b.nomeGuerra}</p>
                        <p className="text-[10px] text-graphite-500">{b.cargo}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep('trocas')} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
              Próximo <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'trocas' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Houve troca de BA neste plantão?</h3>
                <p className="text-sm text-graphite-500">Selecione se algum bombeiro solicitou substituição</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setHouveTrocas('sim')} className={`flex-1 rounded-xl border-2 p-4 text-center transition-all ${houveTrocas === 'sim' ? 'border-aviation-500 bg-aviation-50 dark:bg-aviation-900/20 ring-2 ring-aviation-500/20' : 'border-graphite-200 hover:border-graphite-300 dark:border-border-dark'}`}>
                <p className="text-sm font-semibold text-graphite-900 dark:text-graphite-100">Sim</p>
                <p className="text-xs text-graphite-500">Houve substituição</p>
              </button>
              <button onClick={() => setHouveTrocas('nao')} className={`flex-1 rounded-xl border-2 p-4 text-center transition-all ${houveTrocas === 'nao' ? 'border-aviation-500 bg-aviation-50 dark:bg-aviation-900/20 ring-2 ring-aviation-500/20' : 'border-graphite-200 hover:border-graphite-300 dark:border-border-dark'}`}>
                <p className="text-sm font-semibold text-graphite-900 dark:text-graphite-100">Não</p>
                <p className="text-xs text-graphite-500">Nenhuma substituição</p>
              </button>
            </div>

            {houveTrocas === 'sim' && (
              <div className="mt-6 space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/30 dark:bg-amber-900/10">
                <h4 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">Dados da substituição</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <SearchSelect
                    label="Solicitante (quem pediu a troca)"
                    value={trocaSolicitante}
                    onChange={setTrocaSolicitante}
                    options={disponiveis.map(b => ({ value: b.nomeGuerra, label: `${b.nomeGuerra} - ${b.nomeCompleto} (${b.cargo})` }))}
                    placeholder="Buscar solicitante..."
                  />
                  <SearchSelect
                    label="Solicitado (quem foi chamado)"
                    value={trocaSolicitado}
                    onChange={setTrocaSolicitado}
                    options={disponiveis.map(b => ({ value: b.nomeGuerra, label: `${b.nomeGuerra} - ${b.nomeCompleto} (${b.cargo})` }))}
                    placeholder="Buscar substituto..."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('equipe')} className="flex items-center gap-1 rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <button onClick={() => setStep('preencher')} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
              Próximo <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'preencher' && (
        <div className="space-y-4">
          {/* I. Equipe */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-4 font-bold text-graphite-900 dark:text-graphite-100">I. Equipe de Serviço</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <SearchSelect
                label="1.1 Chefe de Equipe"
                value={chefeEquipe}
                onChange={setChefeEquipe}
                options={disponiveis.filter(b => b.cargo === 'BA-CE').map(b => ({ value: b.nomeGuerra, label: `${b.nomeGuerra} - ${b.nomeCompleto} (${b.cargo})` }))}
                placeholder="Buscar chefe de equipe..."
              />
              <SearchSelect
                label="1.2 Comunicação BA-OC"
                value={comunicacao}
                onChange={setComunicacao}
                options={disponiveis.map(b => ({ value: b.nomeGuerra, label: `${b.nomeGuerra} - ${b.nomeCompleto} (${b.cargo})` }))}
                placeholder="Buscar operador de comunicação..."
              />
            </div>
          </div>

          {/* II. Instruções */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-4 font-bold text-graphite-900 dark:text-graphite-100">II. Instruções</h3>
            <textarea value={instrucoes} onChange={e => setInstrucoes(e.target.value)} placeholder="Uma instrução por linha. Ex: 14. PCINC&#10;15. EQUIPAMENTOS DE PROTEÇÃO" rows={4} className={inputClass + ' resize-y'} />
            {ptrbs.filter(p => p.equipe === equipe && p.data?.startsWith(dataInicio)).length > 0 && (
              <p className="mt-2 text-[11px] text-green-600">✓ Instruções carregadas automaticamente do PTR-BA deste plantão.</p>
            )}
          </div>

          {/* III. Frota */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-4 font-bold text-graphite-900 dark:text-graphite-100">III. Situação Operacional da Frota</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-graphite-200 bg-graphite-50 dark:border-border-dark dark:bg-graphite-900">
                    <th className="p-2 text-left font-semibold text-graphite-600">VIATURA</th>
                    <th className="p-2 text-left font-semibold text-graphite-600">KM INICIAL</th>
                    <th className="p-2 text-left font-semibold text-graphite-600">KM FINAL</th>
                    <th className="p-2 text-left font-semibold text-graphite-600">COMB. INICIAL</th>
                    <th className="p-2 text-left font-semibold text-graphite-600">COMB. FINAL</th>
                    <th className="p-2 text-left font-semibold text-graphite-600">SITUAÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {viaturas.filter((v: any) => v.tipo === 'CCI').map((v: any) => {
                    const key = v.id || v.prefixo || v.nome;
                    const d = frotaDados[key] || { kmIni: '', kmFim: '', combIni: '', combFim: '', situacao: '' };
                    return (
                      <tr key={key} className="border-b border-graphite-100 dark:border-border-dark">
                        <td className="p-2 font-semibold text-graphite-900 dark:text-graphite-100">{v.prefixo || v.nome}</td>
                        <td className="p-2"><input value={d.kmIni} onChange={e => setFrotaDados(prev => ({ ...prev, [key]: { ...prev[key], kmIni: e.target.value } }))} className="w-20 rounded border border-graphite-200 px-2 py-1 text-xs dark:border-border-dark dark:bg-surface-card" /></td>
                        <td className="p-2"><input value={d.kmFim} onChange={e => setFrotaDados(prev => ({ ...prev, [key]: { ...prev[key], kmFim: e.target.value } }))} className="w-20 rounded border border-graphite-200 px-2 py-1 text-xs dark:border-border-dark dark:bg-surface-card" /></td>
                        <td className="p-2"><input value={d.combIni} onChange={e => setFrotaDados(prev => ({ ...prev, [key]: { ...prev[key], combIni: e.target.value } }))} className="w-20 rounded border border-graphite-200 px-2 py-1 text-xs dark:border-border-dark dark:bg-surface-card" /></td>
                        <td className="p-2"><input value={d.combFim} onChange={e => setFrotaDados(prev => ({ ...prev, [key]: { ...prev[key], combFim: e.target.value } }))} className="w-20 rounded border border-graphite-200 px-2 py-1 text-xs dark:border-border-dark dark:bg-surface-card" /></td>
                        <td className="p-2">
                          <select value={d.situacao} onChange={e => setFrotaDados(prev => ({ ...prev, [key]: { ...prev[key], situacao: e.target.value } }))} className="rounded border border-graphite-200 px-2 py-1 text-xs dark:border-border-dark dark:bg-surface-card">
                            <option value="">Selecione</option>
                            <option value="EM LINHA">EM LINHA</option>
                            <option value="RESERVA">RESERVA</option>
                            <option value="MANUTENÇÃO">MANUTENÇÃO</option>
                            <option value="BAIXADO">BAIXADO</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* IV a VIII */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
              <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">IV. Central Faísca</h3>
              <div className="space-y-2">
                <input type="text" value={centralFaisca} onChange={e => setCentralFaisca(e.target.value)} placeholder="3.1 CENTRAL FAÍSCA" className={inputClass} />
                <input type="text" value={radioComunicacao} onChange={e => setRadioComunicacao(e.target.value)} placeholder="3.2 RÁDIOS, HOTLINE" className={inputClass} />
              </div>
            </div>
            <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
              <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">V. TP/EPR</h3>
              <textarea value={tpTexto} onChange={e => setTpTexto(e.target.value)} rows={2} placeholder="Alterações nos TP/EPR..." className={inputClass + ' resize-y'} />
            </div>
            <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
              <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">VI. Agentes Extintores</h3>
              <textarea value={extTexto} onChange={e => setExtTexto(e.target.value)} rows={2} placeholder="Alterações..." className={inputClass + ' resize-y'} />
            </div>
            <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
              <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">VII. Equipamentos</h3>
              <textarea value={equipTexto} onChange={e => setEquipTexto(e.target.value)} rows={2} placeholder="Alterações..." className={inputClass + ' resize-y'} />
            </div>
            <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
              <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">VIII. Edificações</h3>
              <textarea value={edifTexto} onChange={e => setEdifTexto(e.target.value)} rows={2} placeholder="Alterações..." className={inputClass + ' resize-y'} />
            </div>
            <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
              <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">XI. Emergências Aeronáuticas</h3>
              <textarea value={emergenciaXI} onChange={e => setEmergenciaXI(e.target.value)} rows={2} placeholder="Descreva a emergência..." className={inputClass + ' resize-y'} />
            </div>
          </div>

          {/* XII */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">XII. Outras Ocorrências</h3>
            <textarea value={outrasOcorrencias} onChange={e => setOutrasOcorrencias(e.target.value)} rows={3} placeholder="Uma ocorrência por linha..." className={inputClass + ' resize-y'} />
          </div>

          {/* XIII */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">XIII. Solicitações à CCR</h3>
            <textarea value={solicitacoesCCR} onChange={e => setSolicitacoesCCR(e.target.value)} rows={2} placeholder="Uma solicitação por linha..." className={inputClass + ' resize-y'} />
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('trocas')} className="flex items-center gap-1 rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div className="flex gap-3">
              <button onClick={handleSalvarRascunho} disabled={saving} className="flex items-center gap-2 rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 disabled:opacity-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar Rascunho'}
              </button>
              <button onClick={() => setStep('revisar')} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
                Revisar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'revisar' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-4 text-lg font-bold text-graphite-900 dark:text-graphite-100">Resumo do LRO</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Equipe:</span> {equipe}</p>
              <p><span className="font-semibold">Plantão:</span> {dataInicio} a {dataFim}</p>
              <p><span className="font-semibold">Chefe de Equipe:</span> {chefeEquipe || '-'}</p>
              <p><span className="font-semibold">Comunicação:</span> {comunicacao || '-'}</p>
              <p><span className="font-semibold">Houve trocas:</span> {houveTrocas === 'sim' ? `Sim (${trocaSolicitante} → ${trocaSolicitado})` : 'Não'}</p>
              {instrucoes && <p><span className="font-semibold">Instruções:</span> {instrucoes.split('\n').length} registro(s)</p>}
              {emergenciaXI && <p><span className="font-semibold">Emergência Aeronáutica:</span> Sim</p>}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('preencher')} className="flex items-center gap-1 rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div className="flex gap-3">
              <button onClick={handleGerarLRO} disabled={saving} className="flex items-center gap-2 rounded-xl border border-aviation-300 bg-white px-4 py-2.5 text-sm font-medium text-aviation-700 transition-all hover:bg-aviation-50 disabled:opacity-50 dark:border-aviation-700 dark:bg-transparent dark:text-aviation-400">
                <Eye className="h-4 w-4" /> {saving ? 'Gerando...' : 'Visualizar LRO'}
              </button>
              <button onClick={() => setShowConfirm(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:from-green-500 hover:to-green-600 active:scale-[0.98]">
                <Send className="h-4 w-4" /> Enviar para Assinatura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar envio</h3>
            </div>
            <p className="mb-6 text-sm text-graphite-500">
              Após enviar para assinatura, <span className="font-semibold text-graphite-700 dark:text-graphite-300">não será mais possível alterar</span> o LRO. O documento será encaminhado para os 3 signatários via Autentique.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Cancelar
              </button>
              <button onClick={handleEnviarAutentique} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:from-green-500 hover:to-green-600 active:scale-[0.98]">
                <Send className="h-4 w-4" /> Confirmar e Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default GerarLRO;
