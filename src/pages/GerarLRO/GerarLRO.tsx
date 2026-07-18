import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Save, Send, Eye, AlertTriangle, ArrowLeft, ArrowRight, Trash2, Search, Check, X } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarAtivos } from '../../services/bombeiroService';
import { listarFeriasGozo } from '../../services/feriasService';
import { listarSubstituicoesTemporarias } from '../../services/substituicaoTemporariaService';
import { listarDocumentos, listarPreenchimentos, criarPreenchimento } from '../../services/documentoService';
import { listarViaturas } from '../../services/viaturaService';
import { listarPTRBs } from '../../services/ptrbService';
import { listarOcorrencias } from '../../services/ocorrenciaService';
import { listarAPOCs } from '../../services/apocService';
import { salvarDraft, listarDrafts, atualizarStatus, excluirDraft, type LRODraft, type LRODraftStatus } from '../../services/lroDraftService';
import { gerarPDF } from '../../services/lroGenerator';
import { criarDocumento as criarDocumentoAutentique } from '../../services/autentiqueService';
import type { AutentiqueSigner } from '../../services/autentiqueService';
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
  const navigate = useNavigate();
  const username = user?.username || '';

  const [step, setStep] = useState<Step>('equipe');
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [trocaFills, setTrocaFills] = useState<any[]>([]);
  const [todasSubstituicoes, setTodasSubstituicoes] = useState<any[]>([]);
  const [viaturas, setViaturas] = useState<any[]>([]);
  const [ptrbs, setPtrbs] = useState<PTRB[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<LRODraft[]>([]);
  const [apocs, setApocs] = useState<any[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // -- Frota state --
  const [frotaDados, setFrotaDados] = useState<Record<string, { kmIni: string; kmFim: string; combIni: string; combFim: string; situacao: string }>>({});
  const DEFAULT_VIATURAS = [
    { id: 'default-cci-319', prefixo: 'CCI 319', tipo: 'CCI' },
    { id: 'default-cci-320', prefixo: 'CCI 320', tipo: 'CCI' },
    { id: 'default-cci-333', prefixo: 'CCI 333', tipo: 'CCI' },
  ];
  const FROTA_ROWS = 3;

  // -- Wizard state --
  const [equipe, setEquipe] = useState<EquipeOpcao>('Alfa');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState('');
  const [trocaDocId, setTrocaDocId] = useState<string | null>(null);
  const [houveTrocas, setHouveTrocas] = useState<'sim' | 'nao' | null>(null);
  const [trocaSolicitante, setTrocaSolicitante] = useState('');
  const [trocaSolicitado, setTrocaSolicitado] = useState('');
  const [trocaDataFolga, setTrocaDataFolga] = useState('');
  const [trocaMotivo, setTrocaMotivo] = useState('');
  const [trocasManuais, setTrocasManuais] = useState<Array<{ solicitante: string; solicitado: string; dataFolga: string; motivo: string }>>([]);
  const [substituicoesDetectadas, setSubstituicoesDetectadas] = useState<{ id: string; tipo: 'troca' | 'substituicao'; substituido: string; substituto: string; dataSolicitada?: string; dataFolga?: string; confirmada: boolean | null }[]>([]);

  // -- LRO Sections --
  const [chefeEquipe, setChefeEquipe] = useState('');
  const [comunicacao, setComunicacao] = useState('');
  const [equipagemCCI, setEquipagemCCI] = useState<Record<string, string>>({});
  const [equipagemCCIRT, setEquipagemCCIRT] = useState<Record<string, string>>({});
  const [equipagemCRS, setEquipagemCRS] = useState<Record<string, string>>({});
  const [instrucoes, setInstrucoes] = useState('');
  const [instrucoesHorarios, setInstrucoesHorarios] = useState('');
  const [centralFaisca, setCentralFaisca] = useState('SEM ALTERAÇÕES');
  const [radioComunicacao, setRadioComunicacao] = useState('SEM ALTERAÇÕES');
  const [tpTemAlteracao, setTpTemAlteracao] = useState(false);
  const [tpTexto, setTpTexto] = useState('');
  const [extTemAlteracao, setExtTemAlteracao] = useState(false);
  const [extTexto, setExtTexto] = useState('');
  const [equipTemAlteracao, setEquipTemAlteracao] = useState(false);
  const [equipTexto, setEquipTexto] = useState('');
  const [edifTemAlteracao, setEdifTemAlteracao] = useState(false);
  const [edifTexto, setEdifTexto] = useState('');
  const [emergenciaXI, setEmergenciaXI] = useState('');
  const [ocorrenciasNA, setOcorrenciasNA] = useState('');
  const [inspecoes, setInspecoes] = useState('');
  const [outrasOcorrencias, setOutrasOcorrencias] = useState('');
  const [solicitacoesCCR, setSolicitacoesCCR] = useState('');

  const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const ANOS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';
  const isGerente = user?.role === 'gerente';
  const userEquipe = useMemo(() => {
    if (!user?.pessoa?.nomeGuerra) return '';
    const b = bombeiros.find(bb => bb.nomeGuerra === user.pessoa!.nomeGuerra);
    return b?.equipe || '';
  }, [bombeiros, user]);
  const inputClass = 'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400 dark:focus:ring-aviation-400/10';
  const [view, setView] = useState<'lista' | 'wizard'>('lista');
  const [showConfirm, setShowConfirm] = useState(false);
  const [erroValidacao, setErroValidacao] = useState('');
  const [showConfirmTroca, setShowConfirmTroca] = useState(false);
  const [trocaRecusadaIdx, setTrocaRecusadaIdx] = useState<number | null>(null);
  const [showConfirmCorreta, setShowConfirmCorreta] = useState(false);
  const [trocaConfirmadaIdx, setTrocaConfirmadaIdx] = useState<number | null>(null);
  const [showConfirmAdicionar, setShowConfirmAdicionar] = useState(false);
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroEquipeLista, setFiltroEquipeLista] = useState('');
  const [cloneOrigem, setCloneOrigem] = useState<LRODraft | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [b, f, v, p, o, subs, docs, a] = await Promise.all([
          listarAtivos(), listarFeriasGozo(), listarViaturas(), listarPTRBs(), listarOcorrencias(), listarSubstituicoesTemporarias(), listarDocumentos(), listarAPOCs(),
        ]);
        setApocs(a);
        setBombeiros(b);
        setFeriasGozo(f);
        setTodasSubstituicoes(subs);
        setViaturas(v);
        setPtrbs(p);
        setOcorrencias(o);

        const trocaDoc = docs.find((d: any) => d.name?.includes('TROCA') || d.source_module === 'trocas');
        if (trocaDoc) {
          setTrocaDocId(trocaDoc.id);
          const fills = await listarPreenchimentos(trocaDoc.id);
          setTrocaFills(fills.filter((fl: any) => fl.status === 'signed'));
        } else {
          // Fallback: procura fills com nome_solicitante em qualquer documento
          const todosFills = await Promise.all(docs.map((d: any) => listarPreenchimentos(d.id).catch(() => [])));
          const comNome = todosFills.flat().filter((fl: any) => {
            const fd = fl.filled_data || {};
            return fd.nome_solicitante || fd.nome_solicitado;
          });
          setTrocaFills(comNome.filter((fl: any) => fl.status === 'signed'));
        }
        const d = isAdmin
          ? await listarDrafts('').catch(() => [])
          : await listarDrafts(username).catch(() => []);
        setDrafts(d);

        const cci = v.filter((a: any) => a.tipo === 'CCI');
        const frotaInit: Record<string, any> = {};
        cci.forEach((veiculo: any) => { frotaInit[veiculo.id || veiculo.prefixo] = { kmIni: '', kmFim: '', combIni: '', combFim: '', situacao: '' }; });
        setFrotaDados(frotaInit);
        const saved = sessionStorage.getItem('lro_form_backup');
        if (saved) {
          try {
            const p = JSON.parse(saved);
            sessionStorage.removeItem('lro_form_backup');
            setStep(p.step || 'equipe');
            setEquipe(p.equipe || 'Alfa');
            setDataInicio(p.dataInicio || new Date().toISOString().split('T')[0]);
            setDataFim(p.dataFim || '');
            setChefeEquipe(p.chefeEquipe || '');
            setComunicacao(p.comunicacao || '');
            setEquipagemCCI(p.equipagemCCI || {});
            setEquipagemCCIRT(p.equipagemCCIRT || {});
            setEquipagemCRS(p.equipagemCRS || {});
            setInstrucoes(p.instrucoes || '');
            setInstrucoesHorarios(p.instrucoesHorarios || '');
            setFrotaDados(p.frotaDados || {});
            setCentralFaisca(p.centralFaisca || 'SEM ALTERAÇÕES');
            setRadioComunicacao(p.radioComunicacao || 'SEM ALTERAÇÕES');
            setTpTemAlteracao(p.tpTemAlteracao || false);
            setTpTexto(p.tpTexto || '');
            setExtTemAlteracao(p.extTemAlteracao || false);
            setExtTexto(p.extTexto || '');
            setEquipTemAlteracao(p.equipTemAlteracao || false);
            setEquipTexto(p.equipTexto || '');
            setEdifTemAlteracao(p.edifTemAlteracao || false);
            setEdifTexto(p.edifTexto || '');
            setOcorrenciasNA(p.ocorrenciasNA || '');
            setInspecoes(p.inspecoes || '');
            setEmergenciaXI(p.emergenciaXI || '');
            setOutrasOcorrencias(p.outrasOcorrencias || '');
            setSolicitacoesCCR(p.solicitacoesCCR || '');
            setTrocaSolicitante(p.trocaSolicitante || '');
            setTrocaSolicitado(p.trocaSolicitado || '');
            if (p.trocasManuais) setTrocasManuais(p.trocasManuais);
            if (p.substituicoesDetectadas) setSubstituicoesDetectadas(p.substituicoesDetectadas);
            if (p.draftId) setDraftId(p.draftId);
            setView('wizard');
          } catch { /* ignore restore errors */ }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [username]);

  // Auto-detect trocas/substituições do dia e equipe selecionados
  useEffect(() => {
    if (!dataInicio) return;
    const nomesEquipe = bombeiros.filter((b: any) => b.equipe === equipe).map((b: any) => b.nomeGuerra.toLowerCase());
    const resultados: { id: string; tipo: 'troca' | 'substituicao'; substituido: string; substituto: string; confirmada: boolean | null }[] = [];
    // De trocaFills (documento Troca de Serviço) — filtra pela data solicitada
    trocaFills.forEach((fl: any) => {
      const fd = fl.filled_data || {};
      const dataSwap = fd.data_solicitada || (fl.created_at ? fl.created_at.split('T')[0] : '');
      if (dataSwap !== dataInicio) return;
      const nomeSol = fd.nome_solicitante || '';
      const nomeSolic = fd.nome_solicitado || '';
      if (!nomeSol && !nomeSolic) return;
      const solNome = nomeSol.toLowerCase();
      const solicNome = nomeSolic.toLowerCase();
      const pertenceEquipe = nomesEquipe.some(n => solNome.includes(n)) || nomesEquipe.some(n => solicNome.includes(n));
      if (pertenceEquipe) {
        resultados.push({ id: fl.id, tipo: 'troca' as const, substituido: nomeSol, substituto: nomeSolic, dataSolicitada: fd.data_solicitada || '', dataFolga: fd.data_folga_solicitado || '', confirmada: null });
      }
    });
    // De todasSubstituicoes (substituições temporárias aprovadas) — filtra pela data
    todasSubstituicoes.forEach((s: any) => {
      if (s.status !== 'Aprovada') return;
      const dataSubst = s.dataInicio || s.data_inicio || '';
      if (dataSubst !== dataInicio) return;
      const nomeSubstituido = s.funcionarioNome || s.funcionario_nome || '';
      const nomeSubstituto = s.substitutoNome || s.substituto_nome || '';
      if (!nomeSubstituido && !nomeSubstituto) return;
      const substNome = nomeSubstituido.toLowerCase();
      const substNome2 = nomeSubstituto.toLowerCase();
      const pertenceEquipe = nomesEquipe.some(n => substNome.includes(n)) || nomesEquipe.some(n => substNome2.includes(n));
      if (pertenceEquipe) {
        resultados.push({ id: s.id, tipo: 'substituicao' as const, substituido: nomeSubstituido, substituto: nomeSubstituto, confirmada: null });
      }
    });
    setSubstituicoesDetectadas(resultados);
  }, [dataInicio, equipe, trocaFills, todasSubstituicoes, bombeiros]);

  const equipeInversa: Record<string, string> = { Alfa: 'Charlie', Charlie: 'Alfa', Bravo: 'Delta', Delta: 'Bravo' };

  // Auto-pull instructions from PTR-BA when team/date changes
  useEffect(() => {
    const ptrbsFiltrados = ptrbs.filter(p =>
      p.equipe === equipe && p.data && p.data.startsWith(dataInicio)
    );
    if (ptrbsFiltrados.length > 0) {
      const linhas = ptrbsFiltrados.map(p => {
        const assunto = (p.assuntoMinistrado || '').trim();
        return assunto;
      });
      setInstrucoes(linhas.join('\n\n'));
      setInstrucoesHorarios(ptrbsFiltrados.map(p => p.horaInicio || ''));
    }
  }, [equipe, dataInicio, ptrbs]);

  // Auto-pull Ocorrências (Section XII) when team/date changes
  useEffect(() => {
    const ocorrenciasFiltradas = ocorrencias.filter(o =>
      o.equipe === equipe && o.data && o.data.startsWith(dataInicio)
    );
    if (ocorrenciasFiltradas.length > 0) {
      const linhas = ocorrenciasFiltradas.map(o => `${o.titulo}: ${o.descricao}`.trim());
      setOutrasOcorrencias(linhas.join('\n'));
    }
  }, [equipe, dataInicio, ocorrencias]);

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

  function getEmailByNome(nome: string): string {
    if (!nome) return '';
    const b = bombeiros.find(p => p.nomeGuerra === nome || p.nomeCompleto.startsWith(nome) || p.nomeCompleto.includes(nome));
    return b?.email || '';
  }

  function getNomeGuerra(nome: string): string {
    if (!nome) return '';
    const b = bombeiros.find(p => p.nomeCompleto === nome || p.nomeGuerra === nome);
    return b?.nomeGuerra || nome;
  }

  const jaTemManual = trocasManuais.length > 0;
  const substituicoesMap = useMemo(() => {
    if (!dataInicio) return {};
    const map: Record<string, { substitutoNome: string; substitutoId: string; tipo: 'troca' | 'substituicao' }> = {};
    // De trocaFills (documento Troca de Serviço) — filtra pela data solicitada (plantão)
    trocaFills.forEach((fl: any) => {
      const fd = fl.filled_data || {};
      const dataSwap = fd.data_solicitada || (fl.created_at ? fl.created_at.split('T')[0] : '');
      if (dataSwap !== dataInicio) return;
      const nomeSol = fd.nome_solicitante || '';
      const nomeSolic = fd.nome_solicitado || '';
      const pessoaSol = bombeiros.find((b: any) => b.nomeCompleto === nomeSol || b.nomeGuerra === nomeSol);
      const pessoaSolic = bombeiros.find((b: any) => b.nomeCompleto === nomeSolic || b.nomeGuerra === nomeSolic);
      if (pessoaSol && pessoaSolic) {
        map[pessoaSol.id] = { substitutoNome: nomeSolic, substitutoId: pessoaSolic.id, tipo: 'troca' };
        map[pessoaSolic.id] = { substitutoNome: nomeSol, substitutoId: pessoaSol.id, tipo: 'troca' };
      }
    });
    // De todasSubstituicoes (substituições temporárias) — filtra pela data de início
    todasSubstituicoes.forEach((s: any) => {
      const dataSubst = s.dataInicio || s.data_inicio || '';
      if (dataSubst !== dataInicio) return;
      const nomeSubstituido = s.funcionarioNome || s.funcionario_nome || '';
      const nomeSubstituto = s.substitutoNome || s.substituto_nome || '';
      const idSubstituido = s.funcionarioId || s.funcionario_id || '';
      const idSubstituto = s.substitutoId || s.substituto_id || '';
      if (idSubstituido && nomeSubstituto) {
        map[idSubstituido] = { substitutoNome: nomeSubstituto, substitutoId: idSubstituto, tipo: 'substituicao' };
      }
      if (idSubstituto && nomeSubstituido) {
        map[idSubstituto] = { substitutoNome: nomeSubstituido, substitutoId: idSubstituido, tipo: 'substituicao' };
      }
    });
    // De trocasManuais (troca emergencial) — solicitante sai, solicitado entra
    trocasManuais.forEach(tm => {
      const solicitante = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitante);
      const solicitado = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitado);
      if (solicitante && solicitado) {
        map[solicitante.id] = { substitutoNome: tm.solicitado, substitutoId: solicitado.id, tipo: 'troca' };
      }
    });
    return map;
  }, [dataInicio, trocaFills, todasSubstituicoes, trocasManuais, bombeiros]);

  const disponiveis = useMemo(() => {
    const feriasIds = new Set(emFerias.map(f => f.funcionarioId));
    const substituidoIds = new Set(Object.keys(substituicoesMap));
    const idsAdicionados = new Set<string>();
    const presentes = membrosEquipe.filter(b => {
      if (feriasIds.has(b.id) || substituidoIds.has(b.id)) return false;
      idsAdicionados.add(b.id);
      return true;
    });
    Object.entries(substituicoesMap).forEach(([ausenteId, sub]) => {
      if (idsAdicionados.has(ausenteId)) return;
      // Só adiciona o substituto se o ausente for da equipe atual
      const ausente = bombeiros.find((b: any) => b.id === ausenteId);
      if (ausente?.equipe !== equipe) return;
      const substituto = bombeiros.find((b: any) => b.nomeGuerra === sub.substitutoNome || b.nomeCompleto === sub.substitutoNome);
      if (substituto && !idsAdicionados.has(substituto.id)) {
        presentes.push(substituto);
        idsAdicionados.add(substituto.id);
      }
    });
    return presentes;
  }, [membrosEquipe, emFerias, substituicoesMap, bombeiros, equipe]);

  // Auto-determina o Chefe de Equipe efetivo (designado, substituto de troca, ou substituto de férias)
  useEffect(() => {
    if (!dataInicio || !equipe || chefeEquipe) return;
    const designado = bombeiros.find((b: any) => b.cargo === 'BA-CE' && b.equipe === equipe);
    if (!designado) return;
    const sub = substituicoesMap[designado.id];
    if (sub) {
      const substituto = bombeiros.find((b: any) => (b.nomeGuerra === sub.substitutoNome || b.nomeCompleto === sub.substitutoNome) && b.cargo === 'BA-CE');
      if (substituto) setChefeEquipe(substituto.nomeGuerra);
    } else if (disponiveis.some(b => b.id === designado.id)) {
      setChefeEquipe(designado.nomeGuerra);
    }
  }, [dataInicio, equipe, substituicoesMap, disponiveis, bombeiros, chefeEquipe]);

  async function handleSalvarRascunho() {
    setSaving(true);
    try {
      const dados = {
        equipeNome: equipe,
        dataInicio, dataFim,
        chefeEquipe, comunicacao,
        instrucoes: Array.isArray(instrucoes) ? instrucoes : (typeof instrucoes === 'string' ? instrucoes.split('\n').filter(Boolean) : []),
        instrucoesHorarios: Array.isArray(instrucoesHorarios) ? instrucoesHorarios : (typeof instrucoesHorarios === 'string' ? instrucoesHorarios.split('\n').filter(Boolean) : []),
        frota: Array.from({ length: FROTA_ROWS }).map((_, i) => {
          const d = frotaDados[`row_${i}`] || {};
          const frotaLista = viaturas.length > 0 ? viaturas : DEFAULT_VIATURAS;
          const sel = frotaLista.find((vv: any) => vv.id === d.viaturaId);
          return { viatura: sel?.prefixo || sel?.nome || '—', prefixo: d.prefixo || '', kmIni: d.kmIni || '', kmFim: d.kmFim || '', combIni: d.combIni || '', combFim: d.combFim || '', situacao: d.situacao || '' };
        }),
        centralFaisca, radioComunicacao,
        tpTemAlteracao, tpTexto,
        extTemAlteracao, extTexto,
        equipTemAlteracao, equipTexto,
        edifTemAlteracao, edifTexto,
        ocorrenciasNA, inspecoes,
        emergenciaXI,
        ocorrenciasXII: Array.isArray(outrasOcorrencias) ? outrasOcorrencias : (typeof outrasOcorrencias === 'string' ? outrasOcorrencias.split('\n').filter(Boolean) : []),
        solicitacoes: solicitacoesCCR.split('\n').filter(Boolean),
        substituicao: [
          ...substituicoesDetectadas.filter(s => s.tipo === 'troca' && s.confirmada === true).map(s => {
            const p1 = bombeiros.find((b: any) => s.substituido.includes(b.nomeCompleto) || s.substituido.includes(b.nomeGuerra));
            const p2 = bombeiros.find((b: any) => s.substituto.includes(b.nomeCompleto) || s.substituto.includes(b.nomeGuerra));
            return { funcao1: p1?.cargo || 'BA-2', nome1: p1?.nomeCompleto || s.substituido, funcao2: p2?.cargo || 'BA-2', nome2: p2?.nomeCompleto || s.substituto };
          }),
          ...trocasManuais.filter(tm => tm.solicitante && tm.solicitado).map(tm => {
            const p1 = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitante || b.nomeCompleto === tm.solicitante);
            const p2 = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitado || b.nomeCompleto === tm.solicitado);
            return { funcao1: p1?.cargo || 'BA-2', nome1: p1?.nomeCompleto || tm.solicitante, funcao2: p2?.cargo || 'BA-2', nome2: p2?.nomeCompleto || tm.solicitado };
          }),
        ],
        cci2: Object.entries(equipagemCCI).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
        cci3: Object.entries(equipagemCCIRT).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
        crs: Object.entries(equipagemCRS).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
        dataAssinatura: new Date().toLocaleDateString('pt-BR'),
        chefeAssinatura: bombeiros.find((b: any) => b.nomeGuerra === chefeEquipe || b.nomeCompleto === chefeEquipe)?.nomeCompleto || chefeEquipe,
        gerenteAssinatura: bombeiros.find((b: any) => b.cargo === 'GS')?.nomeCompleto || bombeiros.find((b: any) => b.cargo === 'GS')?.nomeGuerra || '',
        coordenadorAssinatura: apocs.find((a: any) => a.funcao === 'SUPERVISOR')?.nomeCompleto || '',
        _trocasManuais: trocasManuais,
        _substituicoesDetectadas: substituicoesDetectadas.filter(s => s.tipo === 'troca' && s.confirmada === true),
      };
      const saved = await salvarDraft(dados, equipe, dataInicio, username, draftId || undefined);
      setDraftId(saved.id);
      const updated = await listarDrafts(username).catch(() => []);
      setDrafts(updated);
      setView('lista');
      setStep('equipe');
      setErroValidacao('');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setErroValidacao(`Erro ao salvar rascunho: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
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
        frota: Array.from({ length: FROTA_ROWS }).map((_, i) => {
          const d = frotaDados[`row_${i}`] || {};
          const frotaLista = viaturas.length > 0 ? viaturas : DEFAULT_VIATURAS;
          const sel = frotaLista.find((vv: any) => vv.id === d.viaturaId);
          return { viatura: sel?.prefixo || sel?.nome || '—', prefixo: d.prefixo || '', kmIni: d.kmIni || '', kmFim: d.kmFim || '', combIni: d.combIni || '', combFim: d.combFim || '', situacao: d.situacao || '' };
        }),
        instrucoes: Array.isArray(instrucoes) ? instrucoes : (typeof instrucoes === 'string' ? instrucoes.split('\n').filter(Boolean) : []),
        instrucoesHorarios: Array.isArray(instrucoesHorarios) ? instrucoesHorarios : (typeof instrucoesHorarios === 'string' ? instrucoesHorarios.split('\n').filter(Boolean) : []),
        centralFaisca: centralFaisca || 'SEM ALTERAÇÕES',
        radioComunicacao: radioComunicacao || 'SEM ALTERAÇÕES',
        tpTexto, extTexto, equipTexto, edifTexto,
        emergenciaXI,
        ocorrenciasXII: Array.isArray(outrasOcorrencias) ? outrasOcorrencias : (typeof outrasOcorrencias === 'string' ? outrasOcorrencias.split('\n').filter(Boolean) : []),
        solicitacoes: solicitacoesCCR.split('\n').filter(Boolean),
        substituicao: [
          ...substituicoesDetectadas.filter(s => s.tipo === 'troca' && s.confirmada === true).map(s => {
            const p1 = bombeiros.find((b: any) => s.substituido.includes(b.nomeCompleto) || s.substituido.includes(b.nomeGuerra));
            const p2 = bombeiros.find((b: any) => s.substituto.includes(b.nomeCompleto) || s.substituto.includes(b.nomeGuerra));
            return { funcao1: p1?.cargo || 'BA-2', nome1: p1?.nomeCompleto || s.substituido, funcao2: p2?.cargo || 'BA-2', nome2: p2?.nomeCompleto || s.substituto };
          }),
          ...trocasManuais.filter(tm => tm.solicitante && tm.solicitado).map(tm => {
            const p1 = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitante || b.nomeCompleto === tm.solicitante);
            const p2 = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitado || b.nomeCompleto === tm.solicitado);
            return { funcao1: p1?.cargo || 'BA-2', nome1: p1?.nomeCompleto || tm.solicitante, funcao2: p2?.cargo || 'BA-2', nome2: p2?.nomeCompleto || tm.solicitado };
          }),
        ],
        cci2: Object.entries(equipagemCCI).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
        cci3: Object.entries(equipagemCCIRT).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
        crs: Object.entries(equipagemCRS).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
        dataAssinatura: new Date().toLocaleDateString('pt-BR'),
        chefeAssinatura: bombeiros.find((b: any) => b.nomeGuerra === chefeEquipe || b.nomeCompleto === chefeEquipe)?.nomeCompleto || chefeEquipe,
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

  function handlePreview() {
    sessionStorage.setItem('lro_form_backup', JSON.stringify({
      step, equipe, dataInicio, dataFim,
      chefeEquipe, comunicacao,
      equipagemCCI, equipagemCCIRT, equipagemCRS,
      instrucoes, instrucoesHorarios,
      frotaDados,
      centralFaisca, radioComunicacao,
      tpTemAlteracao, tpTexto,
      extTemAlteracao, extTexto,
      equipTemAlteracao, equipTexto,
      edifTemAlteracao, edifTexto,
      ocorrenciasNA, inspecoes,
      emergenciaXI, outrasOcorrencias, solicitacoesCCR,
      trocasManuais,
      substituicoesDetectadas, draftId,
    }));
    const dados = {
      equipeNome: equipe, dataInicio, dataFim, chefeEquipe, comunicacao,
      frota: Array.from({ length: FROTA_ROWS }).map((_, i) => {
        const d = frotaDados[`row_${i}`] || {};
        const frotaLista = viaturas.length > 0 ? viaturas : DEFAULT_VIATURAS;
        const sel = frotaLista.find((vv: any) => vv.id === d.viaturaId);
        return { viatura: sel?.prefixo || sel?.nome || '—', prefixo: d.prefixo || '', kmIni: d.kmIni || '', kmFim: d.kmFim || '', combIni: d.combIni || '', combFim: d.combFim || '', situacao: d.situacao || '' };
      }),
      instrucoes: Array.isArray(instrucoes) ? instrucoes : (typeof instrucoes === 'string' ? instrucoes.split('\n').filter(Boolean) : []),
      instrucoesHorarios: Array.isArray(instrucoesHorarios) ? instrucoesHorarios : (typeof instrucoesHorarios === 'string' ? instrucoesHorarios.split('\n').filter(Boolean) : []),
      centralFaisca: centralFaisca || 'SEM ALTERAÇÕES',
      radioComunicacao: radioComunicacao || 'SEM ALTERAÇÕES',
      tpTemAlteracao, tpTexto,
      extTemAlteracao, extTexto,
      equipTemAlteracao, equipTexto,
      edifTemAlteracao, edifTexto,
      ocorrenciasNA, inspecoes,
      emergenciaXI,
      ocorrenciasXII: Array.isArray(outrasOcorrencias) ? outrasOcorrencias : (typeof outrasOcorrencias === 'string' ? outrasOcorrencias.split('\n').filter(Boolean) : []),
      solicitacoes: solicitacoesCCR.split('\n').filter(Boolean),
      substituicao: [
        ...substituicoesDetectadas.filter(s => s.tipo === 'troca' && s.confirmada === true).map(s => {
          const p1 = bombeiros.find((b: any) => s.substituido.includes(b.nomeCompleto) || s.substituido.includes(b.nomeGuerra));
          const p2 = bombeiros.find((b: any) => s.substituto.includes(b.nomeCompleto) || s.substituto.includes(b.nomeGuerra));
            return { funcao1: p1?.cargo || 'BA-2', nome1: p1?.nomeCompleto || s.substituido, funcao2: p2?.cargo || 'BA-2', nome2: p2?.nomeCompleto || s.substituto };
          }),
          ...trocasManuais.filter(tm => tm.solicitante && tm.solicitado).map(tm => {
            const p1 = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitante || b.nomeCompleto === tm.solicitante);
            const p2 = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitado || b.nomeCompleto === tm.solicitado);
            return { funcao1: p1?.cargo || 'BA-2', nome1: p1?.nomeCompleto || tm.solicitante, funcao2: p2?.cargo || 'BA-2', nome2: p2?.nomeCompleto || tm.solicitado };
          }),
        ],
        cci2: Object.entries(equipagemCCI).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
      cci3: Object.entries(equipagemCCIRT).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
      crs: Object.entries(equipagemCRS).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
      dataAssinatura: new Date().toLocaleDateString('pt-BR'),
      chefeAssinatura: bombeiros.find((b: any) => b.nomeGuerra === chefeEquipe || b.nomeCompleto === chefeEquipe)?.nomeCompleto || chefeEquipe,
      gerenteAssinatura: bombeiros.find((b: any) => b.cargo === 'GS')?.nomeCompleto || '',
      coordenadorAssinatura: apocs.find((a: any) => a.funcao === 'SUPERVISOR')?.nomeCompleto || '',
      cidade: 'NAVEGANTES',
      uf: 'SC',
    };
    navigate('/registros-diarios/preview-lro', { state: dados });
  }

  async function handleEnviarAutentique() {
    setShowConfirm(false);
    setSaving(true);
    try {
      const gerenteEncontrado = bombeiros.find((b: any) => b.cargo === 'GS');
      const dados = {
        equipeNome: equipe, dataInicio, dataFim, chefeEquipe, comunicacao,
        frota: Array.from({ length: FROTA_ROWS }).map((_, i) => {
          const d = frotaDados[`row_${i}`] || {};
          const frotaLista = viaturas.length > 0 ? viaturas : DEFAULT_VIATURAS;
          const sel = frotaLista.find((vv: any) => vv.id === d.viaturaId);
          return { viatura: sel?.prefixo || sel?.nome || '—', prefixo: d.prefixo || '', kmIni: d.kmIni || '', kmFim: d.kmFim || '', combIni: d.combIni || '', combFim: d.combFim || '', situacao: d.situacao || '' };
        }),
        instrucoes: Array.isArray(instrucoes) ? instrucoes : (typeof instrucoes === 'string' ? instrucoes.split('\n').filter(Boolean) : []),
        instrucoesHorarios: Array.isArray(instrucoesHorarios) ? instrucoesHorarios : (typeof instrucoesHorarios === 'string' ? instrucoesHorarios.split('\n').filter(Boolean) : []),
        centralFaisca: centralFaisca || 'SEM ALTERAÇÕES',
        radioComunicacao: radioComunicacao || 'SEM ALTERAÇÕES',
        tpTexto, extTexto, equipTexto, edifTexto,
        emergenciaXI,
        ocorrenciasXII: Array.isArray(outrasOcorrencias) ? outrasOcorrencias : (typeof outrasOcorrencias === 'string' ? outrasOcorrencias.split('\n').filter(Boolean) : []),
        solicitacoes: solicitacoesCCR.split('\n').filter(Boolean),
        substituicao: [
          ...substituicoesDetectadas.filter(s => s.tipo === 'troca' && s.confirmada === true).map(s => {
            const p1 = bombeiros.find((b: any) => s.substituido.includes(b.nomeCompleto) || s.substituido.includes(b.nomeGuerra));
            const p2 = bombeiros.find((b: any) => s.substituto.includes(b.nomeCompleto) || s.substituto.includes(b.nomeGuerra));
            return { funcao1: p1?.cargo || 'BA-2', nome1: p1?.nomeCompleto || s.substituido, funcao2: p2?.cargo || 'BA-2', nome2: p2?.nomeCompleto || s.substituto };
          }),
          ...trocasManuais.filter(tm => tm.solicitante && tm.solicitado).map(tm => {
            const p1 = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitante || b.nomeCompleto === tm.solicitante);
            const p2 = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitado || b.nomeCompleto === tm.solicitado);
            return { funcao1: p1?.cargo || 'BA-2', nome1: p1?.nomeCompleto || tm.solicitante, funcao2: p2?.cargo || 'BA-2', nome2: p2?.nomeCompleto || tm.solicitado };
          }),
        ],
        cci2: Object.entries(equipagemCCI).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
        cci3: Object.entries(equipagemCCIRT).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
        crs: Object.entries(equipagemCRS).filter(([, v]) => v).map(([k, v]) => ({ funcao: k.split('_')[0], nome: v })),
        dataAssinatura: new Date().toLocaleDateString('pt-BR'),
        chefeAssinatura: bombeiros.find((b: any) => b.nomeGuerra === chefeEquipe || b.nomeCompleto === chefeEquipe)?.nomeCompleto || chefeEquipe,
        gerenteAssinatura: gerenteEncontrado?.nomeCompleto || gerenteEncontrado?.nomeGuerra || '',
        coordenadorAssinatura: apocs.find((a: any) => a.funcao === 'SUPERVISOR')?.nomeCompleto || '',
      };

      const blob = await gerarPDF(dados);
      const nomeArquivo = `LRO_${equipe}_${dataInicio}_${new Date().toISOString().split('T')[0]}`;
      const emailChefe = getEmailByNome(chefeEquipe);
      const signers: AutentiqueSigner[] = [];
      if (emailChefe) {
        signers.push({
          email: emailChefe,
          action: 'SIGN',
          positions: [
            { x: '5%', y: '86%', z: 0, element: 'SIGNATURE' },
          ],
        });
      } else {
        signers.push({ name: 'Chefe de Equipe', action: 'SIGN', positions: [{ x: '5%', y: '86%', z: 0, element: 'SIGNATURE' }] });
      }
      const gerente = bombeiros.find(b => b.cargo === 'GS');
      if (gerente?.email) {
        signers.push({
          email: gerente.email,
          action: 'SIGN',
          positions: [
            { x: '37%', y: '86%', z: 0, element: 'SIGNATURE' },
          ],
        });
      } else {
        signers.push({ name: 'Gerente SESCINC', action: 'SIGN', positions: [{ x: '37%', y: '86%', z: 0, element: 'SIGNATURE' }] });
      }
      signers.push({ name: 'Coordenador', action: 'SIGN', positions: [{ x: '66%', y: '86%', z: 0, element: 'SIGNATURE' }] });

      const result = await criarDocumentoAutentique(blob, nomeArquivo, signers, undefined, true);
      if (draftId) await atualizarStatus(draftId, 'aguardando');
    } catch (err) {
      console.error('Erro ao enviar para Autentique:', err);
      alert('Erro ao enviar para Autentique: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
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
        const mes = String(parseInt(d.data_plantao.substring(5, 7), 10));
        if (mes !== filtroMes) return false;
      }
      if (!isAdmin && !isGerente && userEquipe && d.equipe !== userEquipe) return false;
      if (isGerente && userEquipe && filtroEquipeLista && d.equipe !== filtroEquipeLista) return false;
      if (isGerente && userEquipe && !filtroEquipeLista && d.equipe !== userEquipe) return false;
      if (isAdmin && filtroEquipeLista && d.equipe !== filtroEquipeLista) return false;
      return true;
    });

    return (
      <PageContainer>
        <div className="mb-6 flex items-center justify-between">
          <PageTitle icon={FileText} title="LRO - Livro Ata de Chefe de Equipe" />
          <div className="flex gap-3">
            <button onClick={() => setCloneOrigem({ id: 'novo', equipe: '', data_plantao: '', status: 'rascunho', dados: {}, created_by: username, created_at: '', updated_at: '', expires_at: '' } as any)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98]">
              <FileText className="h-4 w-4" /> Clonar LRO
            </button>
            <button onClick={() => { setDraftId(null); setStep('equipe'); setView('wizard'); }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
              <FileText className="h-4 w-4" /> Novo LRO
            </button>
          </div>
        </div>

        {/* Filtros estilo LRODiario */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className={inputClass}>
              <option value="">Todos os anos</option>
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={inputClass}>
              <option value="">Todos os meses</option>
              {MESES.slice(1).map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
            </select>
            {isAdmin && (
              <select value={filtroEquipeLista} onChange={e => setFiltroEquipeLista(e.target.value)} className={inputClass}>
                <option value="">Todas as equipes</option>
                {['Alfa','Bravo','Charlie','Delta'].map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            )}
            {!isAdmin && userEquipe && (
              <span className="rounded-full bg-graphite-100 px-3 py-1.5 text-xs font-medium text-graphite-600 dark:bg-graphite-800 dark:text-graphite-300">
                Equipe {userEquipe}
              </span>
            )}
            <p className="text-sm text-graphite-500 dark:text-graphite-400">{filtradas.length} LRO(s)</p>
          </div>
        </div>

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
                  <button onClick={() => {
                    const dd = d.dados as Record<string, any> || {};
                    setDraftId(d.id);
                    setStep('preencher');
                    setEquipe((dd.equipeNome || d.equipe || 'Alfa') as EquipeOpcao);
                    setDataInicio(dd.dataInicio || d.data_plantao || new Date().toISOString().split('T')[0]);
                    setDataFim(dd.dataFim || '');
                    setChefeEquipe(dd.chefeEquipe || '');
                    setComunicacao(dd.comunicacao || '');
                    setEquipagemCCI(dd.cci2 ? Object.fromEntries((dd.cci2 as any[]).map((c: any, i: number) => [`${c.funcao}_${i}`, c.nome])) : {});
                    setEquipagemCCIRT(dd.cci3 ? Object.fromEntries((dd.cci3 as any[]).map((c: any, i: number) => [`${c.funcao}_${i}`, c.nome])) : {});
                    setEquipagemCRS(dd.crs ? Object.fromEntries((dd.crs as any[]).map((c: any, i: number) => [`${c.funcao}_${i}`, c.nome])) : {});
                    setInstrucoes(Array.isArray(dd.instrucoes) ? dd.instrucoes.join('\n') : (dd.instrucoes || ''));
                    setInstrucoesHorarios(dd.instrucoesHorarios || '');
                    if (dd.frota) {
                      const fDados: Record<string, any> = {};
                      (dd.frota as any[]).forEach((f: any, i: number) => {
                        fDados[`row_${i}`] = { viaturaId: '', prefixo: f.prefixo || '', kmIni: f.kmIni || '', kmFim: f.kmFim || '', combIni: f.combIni || '', combFim: f.combFim || '', situacao: f.situacao || '' };
                      });
                      setFrotaDados(fDados);
                    }
                    setCentralFaisca(dd.centralFaisca || 'SEM ALTERAÇÕES');
                    setRadioComunicacao(dd.radioComunicacao || 'SEM ALTERAÇÕES');
                    setTpTemAlteracao(!!dd.tpTemAlteracao);
                    setTpTexto(dd.tpTexto || '');
                    setExtTemAlteracao(!!dd.extTemAlteracao);
                    setExtTexto(dd.extTexto || '');
                    setEquipTemAlteracao(!!dd.equipTemAlteracao);
                    setEquipTexto(dd.equipTexto || '');
                    setEdifTemAlteracao(!!dd.edifTemAlteracao);
                    setEdifTexto(dd.edifTexto || '');
                    setOcorrenciasNA(dd.ocorrenciasNA || '');
                    setInspecoes(dd.inspecoes || '');
                    setEmergenciaXI(dd.emergenciaXI || '');
                    setOutrasOcorrencias(Array.isArray(dd.ocorrenciasXII) ? dd.ocorrenciasXII.join('\n') : (dd.ocorrenciasXII || ''));
                    setSolicitacoesCCR(Array.isArray(dd.solicitacoes) ? dd.solicitacoes.join('\n') : (dd.solicitacoes || ''));
                    if (dd._trocasManuais) setTrocasManuais(dd._trocasManuais);
                    if (dd._substituicoesDetectadas) {
                      const manuais = (dd._substituicoesDetectadas as any[]).filter((s: any) => s.tipo === 'troca' && s.confirmada === true);
                      if (manuais.length > 0) setSubstituicoesDetectadas(manuais);
                    }
                    setView('wizard');
                  }}
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

      {erroValidacao && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-5 py-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{erroValidacao}</p>
        </div>
      )}

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
              {[...disponiveis].sort((a, b) => {
                const hierarquia: Record<string, number> = { 'BA-CE': 1, 'BA-LR': 2, 'BA-MC': 3, 'BA-RE': 4, 'BA-2': 5, 'OC': 6, 'GS': 7 };
                return (hierarquia[a.cargo] || 99) - (hierarquia[b.cargo] || 99);
              }).map(b => {
                const sub = substituicoesMap[b.id];
                const cargoAusente = sub ? (() => { const ba = bombeiros.find((x: any) => x.nomeGuerra === sub.substitutoNome || x.nomeCompleto === sub.substitutoNome); return ba?.cargo || ''; })() : '';
                return (
                  <div key={b.id} className={`group relative rounded-xl border p-2 transition-all ${sub ? (sub.tipo === 'troca' ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/10' : 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/10') : 'border-graphite-100 bg-graphite-50/50 dark:border-border-dark dark:bg-surface-hover/30'}`}>
                    {sub ? (
                      <div className="relative min-h-[52px] flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center transition-all duration-300 group-hover:opacity-0 group-hover:scale-95">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[7px] font-bold mb-0.5 ${sub.tipo === 'troca' ? 'bg-amber-200 text-amber-800 dark:bg-amber-800/40 dark:text-amber-300' : 'bg-blue-200 text-blue-800 dark:bg-blue-800/40 dark:text-blue-300'}`}>
                            {sub.tipo === 'troca' ? '↔ TROCA' : '↔ SUBSTITUIÇÃO'}
                          </span>
                          <p className={`text-xs font-bold ${sub.tipo === 'troca' ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}`}>{b.nomeGuerra}</p>
                          <p className={`text-[9px] ${sub.tipo === 'troca' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>como {b.cargo}</p>
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-90">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[7px] font-bold mb-0.5 ${sub.tipo === 'troca' ? 'bg-amber-100 text-amber-700 dark:bg-amber-800/30 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-300'}`}>
                            {sub.tipo === 'troca' ? '↔ TROCADO' : '↔ SUBSTITUÍDO'}
                          </span>
                          <p className={`text-xs font-bold ${sub.tipo === 'troca' ? 'text-graphite-600 dark:text-graphite-400' : 'text-graphite-600 dark:text-graphite-400'}`}>{getNomeGuerra(sub.substitutoNome)}</p>
                          <p className="text-[9px] text-graphite-500">{cargoAusente}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center min-h-[52px]">
                        <p className="text-xs font-bold text-graphite-900 dark:text-graphite-100">{b.nomeGuerra}</p>
                        <p className="text-[10px] text-graphite-500">{b.cargo}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => {
              if (!dataInicio) { setErroValidacao('Selecione a data de início do plantão.'); return; }
              setErroValidacao('');
              setStep('trocas');
            }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
              Próximo <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'trocas' && (
        <div className="space-y-6">
          {/* Férias do plantão (só informativo) */}
          {emFerias.length > 0 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800/30 dark:bg-blue-900/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800">
                  <span className="text-sm">🏖</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300">Equipe em Férias</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Apenas informativo — não vai para o LRO</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {emFerias.map(f => (
                  <span key={f.funcionarioId} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {f.funcionarioNome}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* SUBSTITUIÇÕES TEMPORÁRIAS (informativo) */}
          {substituicoesDetectadas.filter(s => s.tipo === 'substituicao').length > 0 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 dark:border-blue-800/30 dark:bg-blue-900/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800">
                  <span className="text-sm">📋</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200">Substituições Temporárias</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Apenas informativo — o substituto já está incluído nos slots da equipe
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {substituicoesDetectadas.filter(s => s.tipo === 'substituicao').map(sub => {
                  const findB = (nome: string) => {
                    const n = (nome || '').toLowerCase().trim();
                    return bombeiros.find((x: any) => n.includes(x.nomeGuerra.toLowerCase().trim()) || n.includes(x.nomeCompleto.toLowerCase().trim().split(' ')[0]));
                  };
                  const bSubdo = findB(sub.substituido);
                  const bSub = findB(sub.substituto);
                  return (
                    <div key={sub.id} className="rounded-xl border border-blue-200 bg-white p-4 dark:border-blue-700 dark:bg-surface-card">
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          📋 Substituição
                        </span>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold text-graphite-800 dark:text-graphite-200">{sub.substituido || '—'}</p>
                          {bSubdo && <p className="text-xs text-graphite-500 mt-0.5">{bSubdo.cargo} · EQ {bSubdo.equipe}</p>}
                          {bSubdo?.nomeCompleto !== sub.substituido && <p className="text-xs text-graphite-400 truncate">{bSubdo?.nomeCompleto || ''}</p>}
                        </div>
                        <div className="text-graphite-400 text-sm font-bold shrink-0 pt-1">→</div>
                        <div className="text-left min-w-0 flex-1">
                          <p className="text-base font-bold text-blue-700 dark:text-blue-300">{sub.substituto || '—'}</p>
                          {bSub && <p className="text-xs text-graphite-500 mt-0.5">{bSub.cargo} · EQ {bSub.equipe}</p>}
                          {bSub?.nomeCompleto !== sub.substituto && <p className="text-xs text-graphite-400 truncate">{bSub?.nomeCompleto || ''}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TROCAS DE SERVIÇO (assinadas — confirmar) */}
          {substituicoesDetectadas.filter(s => s.tipo === 'troca').length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-800/30 dark:bg-amber-900/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200">Trocas de Serviço</h3>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {substituicoesDetectadas.filter(s => s.tipo === 'troca').length} troca(s) encontrada(s). Confirme cada uma:
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {substituicoesDetectadas.filter(s => s.tipo === 'troca').map((sub, idx) => {
                  const findB = (nome: string) => {
                    const n = (nome || '').toLowerCase().trim();
                    return bombeiros.find((x: any) => n.includes(x.nomeGuerra.toLowerCase().trim()) || n.includes(x.nomeCompleto.toLowerCase().trim().split(' ')[0]));
                  };
                  const bSubdo = findB(sub.substituido);
                  const bSub = findB(sub.substituto);
                  const getTurno = (e: string) => e === 'Alfa' || e === 'Charlie' ? 'DIURNO' : e === 'Bravo' || e === 'Delta' ? 'NOTURNO' : '';
                  const realIdx = substituicoesDetectadas.indexOf(sub);
                  return (
                  <div key={sub.id || idx} className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 dark:border-amber-700 dark:bg-amber-900/10">
                    <div className="mb-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        🔄 Troca
                      </span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-graphite-800 dark:text-graphite-200">{sub.substituido || '—'}</p>
                        {bSubdo && <p className="text-xs text-graphite-500 mt-0.5">{bSubdo.cargo} · EQ {bSubdo.equipe}</p>}
                        {bSubdo?.nomeCompleto !== sub.substituido && <p className="text-xs text-graphite-400 truncate">{bSubdo?.nomeCompleto || ''}</p>}
                      </div>
                      <div className="text-graphite-400 text-sm font-bold shrink-0 pt-1">↔</div>
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-base font-bold text-amber-700 dark:text-amber-300">{sub.substituto || '—'}</p>
                        {bSub && <p className="text-xs text-graphite-500 mt-0.5">{bSub.cargo} · EQ {bSub.equipe}</p>}
                        {bSub?.nomeCompleto !== sub.substituto && <p className="text-xs text-graphite-400 truncate">{bSub?.nomeCompleto || ''}</p>}
                      </div>
                    </div>
                    {sub.dataSolicitada && (() => {
                      const dataFmt = new Date(sub.dataSolicitada + 'T12:00:00').toLocaleDateString('pt-BR');
                      const eSub = bSub?.equipe || '';
                      const eSubdo = bSubdo?.equipe || '';
                      const tSub = getTurno(eSub);
                      const tSubdo = getTurno(eSubdo);
                      return (
                        <div className="mt-2 text-[10px] text-graphite-400 uppercase">
                          {dataFmt} {tSubdo} · EQ {eSubdo} ↔ {dataFmt} {tSub} · EQ {eSub}
                        </div>
                      );
                    })()}
                    <div className="mt-3 flex gap-2">
                      {sub.confirmada === null ? (
                        <>
                          <button onClick={() => { setTrocaConfirmadaIdx(realIdx); setShowConfirmCorreta(true); }}
                            className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 transition-all hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400">
                            <Check className="h-3.5 w-3.5" /> Correta
                          </button>
                          <button onClick={() => { setTrocaRecusadaIdx(realIdx); setShowConfirmTroca(true); }}
                            className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition-all hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400">
                            <X className="h-3.5 w-3.5" /> Incorreta
                          </button>
                        </>
                      ) : sub.confirmada === true ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          <Check className="h-3.5 w-3.5" /> Confirmada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 dark:bg-red-900/20 dark:text-red-400">
                          <X className="h-3.5 w-3.5" /> Recusada
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TROCAS EMERGENCIAIS (formulário manual) */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">🚨 Troca Extra Emergencial</h3>
                <p className="text-sm text-graphite-500">Registre aqui trocas que ocorreram emergencialmente sem documento no sistema</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SearchSelect
                  label="Solicitante (quem pediu a troca)"
                  value={trocaSolicitante}
                  onChange={setTrocaSolicitante}
                  options={disponiveis
                    .filter(b => b.nomeGuerra !== trocaSolicitado && !trocasManuais.some(t => t.solicitante === b.nomeGuerra || t.solicitado === b.nomeGuerra))
                    .map(b => ({ value: b.nomeGuerra, label: `${b.nomeGuerra} - ${b.nomeCompleto} (${b.cargo})` }))}
                  placeholder="Buscar solicitante..."
                />
                <SearchSelect
                  label="Solicitado (quem foi chamado)"
                  value={trocaSolicitado}
                  onChange={setTrocaSolicitado}
                  options={(() => {
                    const inversa = equipeInversa[equipe] || '';
                    const nomesOcupados = new Set(trocasManuais.flatMap(t => [t.solicitante, t.solicitado]));
                    const equipeInversaMembros = bombeiros.filter(b => b.equipe === inversa && !b.dataDesligamento && b.nomeGuerra !== trocaSolicitante && !nomesOcupados.has(b.nomeGuerra));
                    const outrosMembros = bombeiros.filter(b => b.equipe !== equipe && b.equipe !== inversa && !b.dataDesligamento && b.nomeGuerra !== trocaSolicitante && !nomesOcupados.has(b.nomeGuerra));
                    return [
                      ...equipeInversaMembros.map(b => ({ value: b.nomeGuerra, label: `${b.nomeGuerra} - ${b.nomeCompleto} (${b.cargo}) [${b.equipe}]` })),
                      ...outrosMembros.map(b => ({ value: b.nomeGuerra, label: `${b.nomeGuerra} - ${b.nomeCompleto} (${b.cargo}) [${b.equipe}]` })),
                    ];
                  })()}
                  placeholder="Buscar substituto..."
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Data da Folga</label>
                  <input type="date" value={trocaDataFolga} onChange={e => setTrocaDataFolga(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Motivo</label>
                  <input type="text" value={trocaMotivo} onChange={e => setTrocaMotivo(e.target.value)} placeholder="Ex: Problema pessoal, emergência médica..." className={inputClass} />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowConfirmAdicionar(true)}
                  disabled={!trocaSolicitante || !trocaSolicitado}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-red-400 hover:to-red-500 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> Adicionar Troca Emergencial
                </button>
              </div>
            </div>

            {/* Lista de trocas manuais adicionadas */}
            {trocasManuais.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-bold text-graphite-700 dark:text-graphite-300">Trocas adicionadas ({trocasManuais.length})</h4>
                {trocasManuais.map((tm, i) => {
                  const findB = (nome: string) => {
                    const n = (nome || '').toLowerCase().trim();
                    return bombeiros.find((x: any) => n.includes(x.nomeGuerra.toLowerCase().trim()) || n.includes(x.nomeCompleto.toLowerCase().trim().split(' ')[0]));
                  };
                  const bSol = findB(tm.solicitante);
                  const bSolic = findB(tm.solicitado);
                  return (
                  <div key={i} className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800/30 dark:bg-red-900/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        🚨 Emergencial
                      </span>
                      <button onClick={() => setTrocasManuais(prev => prev.filter((_, j) => j !== i))}
                        className="rounded-lg p-1 text-alert-red transition-all hover:bg-red-50 dark:hover:bg-red-900/20">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-graphite-800 dark:text-graphite-200">{tm.solicitante}</p>
                        {bSol && <p className="text-xs text-graphite-500 mt-0.5">{bSol.cargo} · EQ {bSol.equipe}</p>}
                        {bSol?.nomeCompleto !== tm.solicitante && <p className="text-xs text-graphite-400 truncate">{bSol?.nomeCompleto || ''}</p>}
                        <p className="text-xs text-graphite-400 mt-1">📅 Plantão: {new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-graphite-400 text-sm font-bold shrink-0 pt-1">↔</div>
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-base font-bold text-red-700 dark:text-red-300">{tm.solicitado}</p>
                        {bSolic && <p className="text-xs text-graphite-500 mt-0.5">{bSolic.cargo} · EQ {bSolic.equipe}</p>}
                        {bSolic?.nomeCompleto !== tm.solicitado && <p className="text-xs text-graphite-400 truncate">{bSolic?.nomeCompleto || ''}</p>}
                        {tm.dataFolga && <p className="text-xs text-graphite-400 mt-1">📅 Folga: {new Date(tm.dataFolga + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                      </div>
                    </div>
                    <div className="mt-1">
                      {tm.motivo && <p className="text-xs text-graphite-500">📝 {tm.motivo}</p>}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('equipe')} className="flex items-center gap-1 rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <button onClick={async () => {
              const trocasNaoConfirmadas = substituicoesDetectadas.filter(s => s.tipo === 'troca' && s.confirmada === null);
              if (trocasNaoConfirmadas.length > 0) { setErroValidacao(`Confirme ou rejeite todas as trocas (${trocasNaoConfirmadas.length} pendente(s)).`); return; }
              setErroValidacao('');
              // Criar documentos para trocas manuais
              if (trocasManuais.length > 0 && trocaDocId) {
                try {
                  for (const tm of trocasManuais) {
                    const bSol = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitante || b.nomeCompleto === tm.solicitante);
                    const bSolic = bombeiros.find((b: any) => b.nomeGuerra === tm.solicitado || b.nomeCompleto === tm.solicitado);
                    await criarPreenchimento({
                      document_id: trocaDocId,
                      filled_by: username,
                      filled_data: {
                        nome_solicitante: tm.solicitante,
                        cpf_solicitante: bSol?.cpf || '',
                        funcao_solicitante: bSol?.cargo || '',
                        nome_solicitado: tm.solicitado,
                        cpf_solicitado: bSolic?.cpf || '',
                        data_solicitada: dataInicio,
                        data_folga_solicitado: tm.dataFolga || '',
                        motivo_troca: tm.motivo || '',
                        troca_emergencial: 'SIM',
                        justificativa_emergencial: tm.motivo || '',
                        check_troca_sim: 'V',
                        check_troca_nao: '',
                        deferido_indeferido: 'DEFERIDO',
                        check_deferido: 'V',
                        check_indeferido: '',
                      },
                      status: 'draft',
                      autentique_document_id: null,
                      autentique_link: null,
                    });
                  }
                } catch (err) {
                  console.error('Erro ao criar documento de troca:', err);
                }
              }
              setStep('preencher');
            }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
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
                label="1.1 Chefe de Equipe *"
                value={chefeEquipe}
                onChange={setChefeEquipe}
                options={(() => {
                  const designado = bombeiros.find((b: any) => b.cargo === 'BA-CE' && b.equipe === equipe);
                  if (!designado) return [];
                  const sub = substituicoesMap[designado.id];
                  // Se tem substituição (troca ou férias), mostra o substituto se for BA-CE
                  if (sub) {
                    const substituto = bombeiros.find((b: any) => (b.nomeGuerra === sub.substitutoNome || b.nomeCompleto === sub.substitutoNome) && b.cargo === 'BA-CE');
                    if (substituto) return [{ value: substituto.nomeGuerra, label: `${substituto.nomeGuerra} - ${substituto.nomeCompleto} (${substituto.cargo})` }];
                  }
                  // Sem substituição: mostra o designado se estiver disponível (não de férias)
                  if (disponiveis.some(b => b.id === designado.id)) {
                    return [{ value: designado.nomeGuerra, label: `${designado.nomeGuerra} - ${designado.nomeCompleto} (${designado.cargo})` }];
                  }
                  return [];
                })()}
                placeholder="Chefe de equipe"
              />
              <SearchSelect
                label="1.2 Comunicação BA-OC *"
                value={comunicacao}
                onChange={setComunicacao}
                options={disponiveis.map(b => ({ value: b.nomeGuerra, label: `${b.nomeGuerra} - ${b.nomeCompleto} (${b.cargo})` }))}
                placeholder="Buscar operador de comunicação..."
              />
            </div>
          </div>

          {/* 1.3 Equipagem dos CCI */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-4 font-bold text-graphite-900 dark:text-graphite-100">1.3 Equipagem dos CCI - EM LINHA, CCI - RT e CRS</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'CCI 2', slots: ['BA-CE', 'BA-MC', 'BA-2'], state: equipagemCCI, setState: setEquipagemCCI },
                { label: 'CCI 3', slots: ['BA-MC', 'BA-2', 'BA-2'], state: equipagemCCIRT, setState: setEquipagemCCIRT },
                { label: 'CRS', slots: ['BA-LR', 'BA-MC', 'BA-RE', 'BA-RE'], state: equipagemCRS, setState: setEquipagemCRS },
              ].map(section => (
                <div key={section.label}>
                  <label className="mb-2 block text-sm font-bold text-graphite-800 dark:text-graphite-200">{section.label}</label>
                  <div className="space-y-2">
                    {section.slots.map((cargo, idx) => {
                      const key = `${cargo}_${idx}`;
                      const selected = section.state[key] || '';
                      const cargoFiltro = cargo === 'BA-RE' ? 'BA-2' : cargo;
                      const selectedInOtherSlots = new Set([
                        ...Object.values(equipagemCCI),
                        ...Object.values(equipagemCCIRT),
                        ...Object.values(equipagemCRS),
                      ].filter(Boolean));
                      const opts = disponiveis
                        .filter(b => b.cargo === cargoFiltro && (!selectedInOtherSlots.has(b.nomeGuerra) || selected === b.nomeGuerra))
                        .map(b => ({ value: b.nomeGuerra, label: `${b.nomeGuerra} - ${b.nomeCompleto}` }));
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-14 shrink-0 text-[10px] font-bold uppercase text-graphite-500 dark:text-graphite-400">{cargo}</span>
                          <select
                            value={selected}
                            onChange={e => section.setState(prev => ({ ...prev, [key]: e.target.value }))}
                            className="flex-1 rounded-lg border border-graphite-200 px-2 py-1.5 text-xs dark:border-border-dark dark:bg-surface-card"
                          >
                            <option value="">Selecionar...</option>
                            {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 1.3 Substituições de BA */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-4 font-bold text-graphite-900 dark:text-graphite-100">1.3 Substituições de BA</h3>
            <div className="flex items-center gap-6 mb-4">
              <label className="flex items-center gap-2 text-sm text-graphite-700 dark:text-graphite-300">
                <input type="checkbox" checked={substituicoesDetectadas.some(s => s.tipo === 'troca' && s.confirmada === true) || trocasManuais.length > 0} readOnly className="h-4 w-4 rounded border-graphite-300 text-aviation-600" />
                ABAIXO
              </label>
              <label className="flex items-center gap-2 text-sm text-graphite-700 dark:text-graphite-300">
                <input type="checkbox" checked={!substituicoesDetectadas.some(s => s.tipo === 'troca' && s.confirmada === true) && trocasManuais.length === 0} readOnly className="h-4 w-4 rounded border-graphite-300 text-aviation-600" />
                NÃO HOUVE
              </label>
            </div>
            {substituicoesDetectadas.filter(s => s.tipo === 'troca' && s.confirmada === true).map(sub => {
              const findB = (nome: string) => {
                const n = (nome || '').toLowerCase().trim();
                return bombeiros.find((x: any) => n.includes(x.nomeGuerra.toLowerCase().trim()) || n.includes(x.nomeCompleto.toLowerCase().trim().split(' ')[0]));
              };
              const p1 = findB(sub.substituido);
              const p2 = findB(sub.substituto);
              return (
                <div key={sub.id} className="mb-2 rounded-lg border border-graphite-200 bg-graphite-50 p-3 dark:border-border-dark dark:bg-graphite-800">
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-graphite-800 dark:text-graphite-200">{p1?.nomeGuerra || sub.substituido}</p>
                      <p className="text-xs text-graphite-500">{p1?.cargo || 'BA-2'} · EQ {p1?.equipe || '—'}</p>
                      {p1?.nomeCompleto !== p1?.nomeGuerra && <p className="text-xs text-graphite-400 truncate">{p1?.nomeCompleto || ''}</p>}
                    </div>
                    <div className="text-graphite-400 text-xs font-bold shrink-0 pt-1">↔</div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="font-bold text-graphite-800 dark:text-graphite-200">{p2?.nomeGuerra || sub.substituto}</p>
                      <p className="text-xs text-graphite-500">{p2?.cargo || 'BA-2'} · EQ {p2?.equipe || '—'}</p>
                      {p2?.nomeCompleto !== p2?.nomeGuerra && <p className="text-xs text-graphite-400 truncate">{p2?.nomeCompleto || ''}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-graphite-400 mt-1">📅 Plantão: {new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
              );
            })}
            {trocasManuais.map((tm, i) => {
              const findB = (nome: string) => {
                const n = (nome || '').toLowerCase().trim();
                return bombeiros.find((x: any) => n.includes(x.nomeGuerra.toLowerCase().trim()) || n.includes(x.nomeCompleto.toLowerCase().trim().split(' ')[0]));
              };
              const p1 = findB(tm.solicitante);
              const p2 = findB(tm.solicitado);
              return (
              <div key={`manual-${i}`} className="mb-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800/30 dark:bg-red-900/10">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-graphite-800 dark:text-graphite-200">{tm.solicitante}</p>
                    {p1 && <p className="text-xs text-graphite-500">{p1.cargo} · EQ {p1.equipe}</p>}
                    {p1?.nomeCompleto !== tm.solicitante && <p className="text-xs text-graphite-400 truncate">{p1?.nomeCompleto || ''}</p>}
                    <p className="text-xs text-graphite-400 mt-0.5">📅 Plantão: {new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-graphite-400 text-xs font-bold shrink-0 pt-1">↔</div>
                  <div className="text-left min-w-0 flex-1">
                    <p className="font-bold text-red-700 dark:text-red-300">{tm.solicitado}</p>
                    {p2 && <p className="text-xs text-graphite-500">{p2.cargo} · EQ {p2.equipe}</p>}
                    {p2?.nomeCompleto !== tm.solicitado && <p className="text-xs text-graphite-400 truncate">{p2?.nomeCompleto || ''}</p>}
                    {tm.dataFolga && <p className="text-xs text-graphite-400 mt-0.5">📅 Folga: {new Date(tm.dataFolga + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    🚨 Emergencial
                  </span>
                  {tm.motivo && <span className="text-xs text-graphite-500">📝 {tm.motivo}</span>}
                </div>
              </div>
              );
            })}
          </div>

          {/* II. Instruções */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-graphite-900 dark:text-graphite-100">II. Instruções</h3>
              <button onClick={async () => {
                const p = await listarPTRBs();
                setPtrbs(p);
              }} className="flex items-center gap-1 rounded-lg border border-graphite-300 bg-white px-3 py-1.5 text-xs font-medium text-graphite-600 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300">
                🔄 Recarregar
              </button>
            </div>
            <textarea value={instrucoes} readOnly placeholder={"14. PCINC - Verificar conformidade dos extintores e hidrantes\n\n15. EQUIPAMENTOS DE PROTEÇÃO - Manter EPIs atualizados"} rows={4} className={inputClass + ' resize-y cursor-not-allowed opacity-80'} />
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
                    <th className="p-2 text-left font-semibold text-graphite-600">PREFIXO</th>
                    <th className="p-2 text-left font-semibold text-graphite-600">KM INICIAL</th>
                    <th className="p-2 text-left font-semibold text-graphite-600">KM FINAL</th>
                    <th className="p-2 text-left font-semibold text-graphite-600">COMB. INICIAL</th>
                    <th className="p-2 text-left font-semibold text-graphite-600">COMB. FINAL</th>
                    <th className="p-2 text-left font-semibold text-graphite-600">SITUAÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: FROTA_ROWS }).map((_, rowIdx) => {
                    const frotaLista = viaturas.length > 0 ? viaturas : DEFAULT_VIATURAS;
                    const frotaOpts = [{ id: '', prefixo: '—' }, ...frotaLista].map((vv: any) => ({ id: vv.id, label: vv.prefixo || vv.nome || '—' }));
                    const selectedId = frotaDados[`row_${rowIdx}`]?.viaturaId || '';
                    const prefixoPadrao = ['F2 X6', 'F3 X6', 'FRT X6'][rowIdx] || '';
                    let d = frotaDados[`row_${rowIdx}`] || { kmIni: '', kmFim: '', combIni: '', combFim: '', situacao: '', viaturaId: '', prefixo: '' };
                    if (!d.prefixo) d = { ...d, prefixo: prefixoPadrao };
                    const updateRow = (updates: Record<string, string>) => setFrotaDados(prev => ({ ...prev, [`row_${rowIdx}`]: { ...prev[`row_${rowIdx}`], ...updates } }));
                    return (
                      <tr key={`frota-row-${rowIdx}`} className="border-b border-graphite-100 dark:border-border-dark">
                        <td className="p-2">
                          <select value={selectedId} onChange={e => updateRow({ viaturaId: e.target.value })} className="rounded border border-graphite-200 px-2 py-1 text-xs dark:border-border-dark dark:bg-surface-card">
                            <option value="">Selecione</option>
                            {frotaOpts.filter(o => o.id).map(o => (
                              <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 font-semibold text-graphite-700 dark:text-graphite-300 text-xs">{d.prefixo || '—'}</td>
                        <td className="p-2"><input value={d.kmIni || ''} onChange={e => updateRow({ kmIni: e.target.value })} className="w-20 rounded border border-graphite-200 px-2 py-1 text-xs dark:border-border-dark dark:bg-surface-card" /></td>
                        <td className="p-2"><input value={d.kmFim || ''} onChange={e => updateRow({ kmFim: e.target.value })} className="w-20 rounded border border-graphite-200 px-2 py-1 text-xs dark:border-border-dark dark:bg-surface-card" /></td>
                        <td className="p-2"><input value={d.combIni || ''} onChange={e => updateRow({ combIni: e.target.value })} className="w-20 rounded border border-graphite-200 px-2 py-1 text-xs dark:border-border-dark dark:bg-surface-card" /></td>
                        <td className="p-2"><input value={d.combFim || ''} onChange={e => updateRow({ combFim: e.target.value })} className="w-20 rounded border border-graphite-200 px-2 py-1 text-xs dark:border-border-dark dark:bg-surface-card" /></td>
                        <td className="p-2">
                          <select value={d.situacao || ''} onChange={e => updateRow({ situacao: e.target.value })} className="rounded border border-graphite-200 px-2 py-1 text-xs dark:border-border-dark dark:bg-surface-card">
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

          {/* IV */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">IV. Central Faísca</h3>
            <div className="space-y-2">
              <input type="text" value={centralFaisca} onChange={e => setCentralFaisca(e.target.value)} placeholder="3.1 CENTRAL FAÍSCA" className={inputClass} />
              <input type="text" value={radioComunicacao} onChange={e => setRadioComunicacao(e.target.value)} placeholder="3.2 RÁDIOS, HOTLINE" className={inputClass} />
            </div>
          </div>

          {/* V a VIII */}
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { titulo: 'V. TP/EPR', temAlt: tpTemAlteracao, setTemAlt: setTpTemAlteracao, texto: tpTexto, setTexto: setTpTexto, placeholder: 'Alterações nos TP/EPR...' },
              { titulo: 'VI. Agentes Extintores', temAlt: extTemAlteracao, setTemAlt: setExtTemAlteracao, texto: extTexto, setTexto: setExtTexto, placeholder: 'Alterações...' },
              { titulo: 'VII. Equipamentos', temAlt: equipTemAlteracao, setTemAlt: setEquipTemAlteracao, texto: equipTexto, setTexto: setEquipTexto, placeholder: 'Alterações...' },
              { titulo: 'VIII. Edificações', temAlt: edifTemAlteracao, setTemAlt: setEdifTemAlteracao, texto: edifTexto, setTexto: setEdifTexto, placeholder: 'Alterações...' },
            ].map(s => (
              <div key={s.titulo} className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
                <h3 className="mb-3 font-bold text-graphite-900 dark:text-graphite-100">{s.titulo}</h3>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 text-sm text-graphite-700 dark:text-graphite-300 cursor-pointer">
                    <input type="radio" name={s.titulo} checked={s.temAlt} onChange={() => s.setTemAlt(true)} className="h-4 w-4 text-aviation-600" />
                    ABAIXO
                  </label>
                  <label className="flex items-center gap-2 text-sm text-graphite-700 dark:text-graphite-300 cursor-pointer">
                    <input type="radio" name={s.titulo} checked={!s.temAlt} onChange={() => { s.setTemAlt(false); s.setTexto(''); }} className="h-4 w-4 text-aviation-600" />
                    SEM ALTERAÇÕES
                  </label>
                </div>
                {s.temAlt && (
                  <textarea value={s.texto} onChange={e => s.setTexto(e.target.value)} rows={2} placeholder={s.placeholder} className={inputClass + ' resize-y'} />
                )}
              </div>
            ))}
            </div>

          {/* IX */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">IX. Ocorrências Não Aeronáuticas</h3>
            <textarea value={ocorrenciasNA} onChange={e => setOcorrenciasNA(e.target.value)} rows={2} placeholder="Descreva as ocorrências não aeronáuticas..." className={inputClass + ' resize-y'} />
          </div>

          {/* X */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">X. Inspeções Técnicas e Vistorias</h3>
            <textarea value={inspecoes} onChange={e => setInspecoes(e.target.value)} rows={2} placeholder="Descreva as inspeções técnicas e vistorias..." className={inputClass + ' resize-y'} />
          </div>

          {/* XI */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">XI. Emergências Aeronáuticas</h3>
            <textarea value={emergenciaXI} onChange={e => setEmergenciaXI(e.target.value)} rows={2} placeholder="Descreva a emergência..." className={inputClass + ' resize-y'} />
          </div>

          {/* XII */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">XII. Outras Ocorrências</h3>
            <textarea value={outrasOcorrencias} onChange={e => setOutrasOcorrencias(e.target.value)} rows={3} placeholder="Uma ocorrência por linha..." className={inputClass + ' resize-y'} />
            {ocorrencias.filter(o => o.equipe === equipe && o.data?.startsWith(dataInicio)).length > 0 && (
              <p className="mt-2 text-[11px] text-green-600">✓ Ocorrências carregadas automaticamente do dia.</p>
            )}
          </div>

          {/* XIII */}
          <div className="rounded-2xl border border-graphite-200 bg-white p-6 dark:border-border-dark dark:bg-surface-card">
            <h3 className="mb-2 font-bold text-graphite-900 dark:text-graphite-100">XIII. Solicitações à CCR</h3>
            <textarea value={solicitacoesCCR} onChange={e => setSolicitacoesCCR(e.target.value)} rows={2} placeholder="Uma solicitação por linha..." className={inputClass + ' resize-y'} />
          </div>

          <div className="flex justify-between">
            <button onClick={() => draftId ? setView('lista') : setStep('trocas')} className="flex items-center gap-1 rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div className="flex gap-3">
              <button onClick={handlePreview} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:from-violet-500 hover:to-violet-600 disabled:opacity-50">
                <Eye className="h-4 w-4" /> Visualizar
              </button>
              <button onClick={handleSalvarRascunho} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar Rascunho'}
              </button>
              <button onClick={() => {
                if (!chefeEquipe) { setErroValidacao('Selecione o Chefe de Equipe (campo 1.1).'); return; }
                if (!comunicacao) { setErroValidacao('Selecione a Comunicação BA-OC (campo 1.2).'); return; }
                if (!dataInicio) { setErroValidacao('Data de início do plantão é obrigatória.'); return; }
                setErroValidacao('');
                setStep('revisar');
              }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
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
              <p><span className="font-semibold">Trocas:</span> {substituicoesDetectadas.filter(s => s.tipo === 'troca' && s.confirmada === true).length} confirmada(s) + {trocasManuais.length} emergencial(is)</p>
              {instrucoes && (Array.isArray(instrucoes) ? instrucoes.length : instrucoes.split('\n').filter(Boolean).length) > 0 && <p><span className="font-semibold">Instruções:</span> {Array.isArray(instrucoes) ? instrucoes.length : instrucoes.split('\n').filter(Boolean).length} registro(s)</p>}
              {emergenciaXI && <p><span className="font-semibold">Emergência Aeronáutica:</span> Sim</p>}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('preencher')} className="flex items-center gap-1 rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div className="flex gap-3">
              <button onClick={handlePreview} className="flex items-center gap-2 rounded-xl border border-aviation-300 bg-white px-4 py-2.5 text-sm font-medium text-aviation-700 transition-all hover:bg-aviation-50 disabled:opacity-50 dark:border-aviation-700 dark:bg-transparent dark:text-aviation-400">
                <Eye className="h-4 w-4" /> Preview LRO
              </button>
              <button onClick={() => setShowConfirm(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:from-green-500 hover:to-green-600 active:scale-[0.98]">
                <Send className="h-4 w-4" /> Enviar para Assinatura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {/* Troca recusada warning */}
      {showConfirmTroca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Atenção - Troca Registrada</h3>
            </div>
            <p className="mb-4 text-sm text-graphite-500">
              Esta troca consta no sistema como um documento de <strong>Troca de Serviço</strong>. 
              Se ela realmente não ocorreu, ela deverá ser <strong>cancelada no formulário de Troca de Serviço</strong> 
              para evitar inconsistências.
            </p>
            <p className="mb-6 text-sm text-graphite-500">
              Deseja marcar como incorreta mesmo assim?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowConfirmTroca(false); setTrocaRecusadaIdx(null); }}
                className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Voltar
              </button>
              <button onClick={() => {
                if (trocaRecusadaIdx !== null) {
                  setSubstituicoesDetectadas(prev => prev.map((s, i) => i === trocaRecusadaIdx ? { ...s, confirmada: false } : s));
                }
                setShowConfirmTroca(false);
                setTrocaRecusadaIdx(null);
              }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl active:scale-[0.98]">
                <X className="h-4 w-4" /> Sim, marcar como Incorreta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar adicionar troca manual */}
      {showConfirmAdicionar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Adicionar Troca Manual</h3>
            </div>
            <p className="mb-6 text-sm text-graphite-500">
              Após adicionar esta troca, ela será incluída no LRO como uma troca confirmada e <span className="font-semibold text-graphite-700 dark:text-graphite-300">não será mais possível removê-la</span>.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirmAdicionar(false)}
                className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Voltar
              </button>
              <button onClick={() => {
                if (!trocaSolicitante || !trocaSolicitado) return;
                setTrocasManuais(prev => [...prev, { solicitante: trocaSolicitante, solicitado: trocaSolicitado, dataFolga: trocaDataFolga, motivo: trocaMotivo }]);
                setTrocaSolicitante('');
                setTrocaSolicitado('');
                setTrocaDataFolga('');
                setTrocaMotivo('');
                setShowConfirmAdicionar(false);
              }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 active:scale-[0.98]">
                <Check className="h-4 w-4" /> Sim, Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Troca correta warning */}
      {showConfirmCorreta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar Troca</h3>
            </div>
            <p className="mb-6 text-sm text-graphite-500">
              Confirma que esta troca está <strong>correta</strong>? Após confirmar, <span className="font-semibold text-graphite-700 dark:text-graphite-300">não será possível alterar</span>.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowConfirmCorreta(false); setTrocaConfirmadaIdx(null); }}
                className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Voltar
              </button>
              <button onClick={() => {
                if (trocaConfirmadaIdx !== null) {
                  setSubstituicoesDetectadas(prev => prev.map((s, i) => i === trocaConfirmadaIdx ? { ...s, confirmada: true } : s));
                }
                setShowConfirmCorreta(false);
                setTrocaConfirmadaIdx(null);
              }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl active:scale-[0.98]">
                <Check className="h-4 w-4" /> Sim, confirmar
              </button>
            </div>
          </div>
        </div>
      )}

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
