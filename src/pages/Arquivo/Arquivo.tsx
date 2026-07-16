import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Archive, Search, FileText, Loader2, CheckCircle, XCircle, Clock,
  RefreshCw, CalendarDays, HardHat, Award, AlertTriangle,
  ClipboardList, FileSpreadsheet, Target, ScrollText, ClipboardCheck,
  Activity, FileDown,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import {
  listarDocumentos, listarPreenchimentos,
} from '../../services/documentoService';
import type { Document, DocumentFill } from '../../types/document';
import { SOURCE_MODULE_OPTIONS } from '../../types/document';
import { gerarPdfHtml, TEMPLATE_DDS, TEMPLATE_LRO, extrairVariaveis } from '../../services/htmlPdfService';
import { useAuth } from '../../context/AuthContext';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const TIPO_ICONS: Record<string, typeof FileText> = {
  trocas: RefreshCw,
  ferias: CalendarDays,
  epis: HardHat,
  certificacoes: Award,
  ocorrencias: AlertTriangle,
  bona: FileText,
  rae: FileText,
  ordem_servico: ClipboardList,
  lro: FileSpreadsheet,
  ptrba: FileText,
  taf: Target,
  tpepr: ScrollText,
  exercicio_posicionamento: Target,
  exercicio_tempo_resposta: Activity,
  dds: FileText,
  checklists: ClipboardCheck,
};

const TIPO_LABELS: Record<string, string> = {};
SOURCE_MODULE_OPTIONS.forEach(o => { TIPO_LABELS[o.value] = o.label; });

function getTipoIcon(tipo?: string) {
  if (tipo && TIPO_ICONS[tipo]) return TIPO_ICONS[tipo];
  return Archive;
}

function getTipoLabel(tipo?: string) {
  if (!tipo) return 'Arquivo';
  return TIPO_LABELS[tipo] ? `Arquivo - ${TIPO_LABELS[tipo]}` : `Arquivo - ${tipo}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

export default function Arquivo() {
  const { tipo } = useParams<{ tipo: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === 'desenvolvedor' || user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [fills, setFills] = useState<DocumentFill[]>([]);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(-1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showVars, setShowVars] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [docs, allFills] = await Promise.all([
        listarDocumentos(),
        listarPreenchimentos(),
      ]);
      setDocuments(docs);
      setFills(allFills);
    } catch (err) {
      console.error('Erro ao carregar arquivo:', err);
    } finally {
      setLoading(false);
    }
  }

  const docMap = useMemo(() => {
    const map = new Map<string, Document>();
    documents.forEach(d => map.set(d.id, d));
    return map;
  }, [documents]);

  const filteredFills = useMemo(() => {
    let result = [...fills];

    if (tipo) {
      const docIds = new Set(
        documents.filter(d => d.source_module === tipo).map(d => d.id)
      );
      result = result.filter(f => docIds.has(f.document_id));
    }

    if (filterMonth >= 0) {
      result = result.filter(f => {
        const d = new Date(f.created_at);
        return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
      });
    } else {
      result = result.filter(f => {
        const d = new Date(f.created_at);
        return d.getFullYear() === filterYear;
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter(f => f.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(f => {
        const data = f.filled_data as Record<string, string> || {};
        return Object.values(data).some(v => String(v || '').toLowerCase().includes(q));
      });
    }

    return result;
  }, [fills, documents, tipo, filterMonth, filterYear, statusFilter, search]);

  const grupos = useMemo(() => {
    const g = new Map<string, { doc: Document; fills: DocumentFill[] }>();
    filteredFills.forEach(fill => {
      const doc = docMap.get(fill.document_id);
      if (!doc) return;
      const entry = g.get(fill.document_id) || { doc, fills: [] };
      entry.fills.push(fill);
      g.set(fill.document_id, entry);
    });
    const result = Array.from(g.values());
    result.sort((a, b) => a.doc.name.localeCompare(b.doc.name));
    return result;
  }, [filteredFills, docMap]);

  const anos = useMemo(() => {
    const s = new Set<number>();
    fills.forEach(f => s.add(new Date(f.created_at).getFullYear()));
    if (s.size === 0) s.add(new Date().getFullYear());
    return Array.from(s).sort((a, b) => b - a);
  }, [fills]);

  async function baixarPdf(template: string, nome: string, dados: Record<string, string>) {
    const blob = await gerarPdfHtml({
      htmlTemplate: template,
      dados,
      logoUrl: undefined,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nome}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function testarDDS() {
    await baixarPdf(TEMPLATE_DDS, 'DDS', {
      data: new Date().toLocaleDateString('pt-BR'),
      horario: '08:00',
      facilitador: 'CB João Silva',
      tema: 'Segurança no Manuseio de EPIs',
      conteudo: `1. INTRODUÇÃO\n\nHoje vamos abordar o uso correto dos EPIs durante operações de combate a incêndio.\n\n2. PONTOS ABORDADOS\n- Verificação diária dos EPIs\n- Procedimentos de vestimenta\n- Identificação de danos\n- Armazenamento adequado\n\n3. DISCUSSÃO\nOs participantes relataram situações onde a falta de manutenção preventiva poderia ter causado acidentes.\n\n4. RECOMENDAÇÕES\n- Checklist no início de cada plantão\n- Comunicar danos imediatamente`,
      participantes: 'CB João Silva\nSD Pedro Santos\nSD Maria Oliveira\nCB Carlos Souza',
    });
  }

  async function testarLRO() {
    const escala_linhas = [
      { funcao: 'BA-2', cci02: 'SD Pedro Alves', cci03: 'SD Ana Costa', crs: '-' },
      { funcao: 'BA-MC', cci02: 'SD Lucas Pereira', cci03: 'SD Rafael Souza', crs: '-' },
      { funcao: 'BA-CE', cci02: '-', cci03: '-', crs: 'CB Márcio Oliveira' },
    ].map(r => `<tr><td style="padding:2px 4px;border:1px solid #ddd;">${r.funcao}</td><td style="padding:2px 4px;border:1px solid #ddd;">${r.cci02}</td><td style="padding:2px 4px;border:1px solid #ddd;">${r.cci03}</td><td style="padding:2px 4px;border:1px solid #ddd;">${r.crs}</td></tr>`).join('');

    await baixarPdf(TEMPLATE_LRO, 'LRO', {
      equipe: 'Alfa',
      turno: 'Diurno',
      dataEntrada: '16/07/2026',
      dataSaida: '16/07/2026',
      chefeEquipe: 'CB João Silva',
      apoc: 'Carlos Santos',
      escala_linhas,
      apoioOutros: 'FD Fernando Lima (Extras)',
      instrucoes: 'PTR-BA nº 123/2026 - Plantão 24h normal.\nManter atenção nas condições meteorológicas.',
      f2_cci319: 'OK', f2_cci320: 'OK', f2_cci333: 'OK',
      f2_kmInicial: '45230', f2_kmFinal: '45580',
      f2_combInicial: '80', f2_combFinal: '45',
      f2_nitrogenio: '200 bar', f2_epr: 'OPERACIONAIS',
      f3_cci319: 'OK', f3_cci320: 'OK', f3_cci333: 'OK',
      f3_kmInicial: '31200', f3_kmFinal: '31450',
      f3_combInicial: '90', f3_combFinal: '60',
      f3_nitrogenio: '200 bar', f3_epr: 'OPERACIONAIS',
      frt_cci319: 'OK', frt_cci320: 'OK', frt_cci333: 'OK',
      frt_kmInicial: '-', frt_kmFinal: '-',
      frt_combInicial: '-', frt_combFinal: '-',
      frt_nitrogenio: '-', frt_epr: 'OPERACIONAIS',
      crs_situacao: 'EM LINHA',
      crs_kmOdoInicial: '125000', crs_kmOdoFinal: '125340',
      crs_kmTacInicial: '124800', crs_kmTacFinal: '125140',
      crs_combInicial: '100', crs_combFinal: '75',
      crs_epr: 'OPERACIONAIS',
      situacaoCentralFaisca: 'SEM ALTERAÇÕES',
      situacaoComunicacao: 'SEM ALTERAÇÕES',
      situacaoTPEPR: 'SEM ALTERAÇÕES',
      situacaoAgentesExtintores: 'SEM ALTERAÇÕES',
      situacaoEquipamentos: 'SEM ALTERAÇÕES',
      situacaoEdificacoes: 'SEM ALTERAÇÕES',
      inspecoesTecnicas: 'Vistoria no hangar X às 14h - sem anormalidades.',
      emergenciasAeronauticas: '',
      outrasOcorrencias: 'Apoio ao resgate de animal na pista.',
    });
  }

  if (loading) {
    return (
      <PageContainer>
        <PageTitle icon={Archive} title="Arquivo" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-aviation-500" />
        </div>
      </PageContainer>
    );
  }

  return (
    <>
    <PageContainer>
      <PageTitle icon={getTipoIcon(tipo)} title={getTipoLabel(tipo)} />

      {isAdmin && !tipo && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={testarDDS}
            className="flex items-center gap-2 rounded-lg border border-aviation-200 bg-aviation-50 px-3 py-2 text-sm font-medium text-aviation-700 hover:bg-aviation-100 dark:border-aviation-700 dark:bg-aviation-900/20 dark:text-aviation-300 dark:hover:bg-aviation-900/30"
          >
            <FileDown className="h-4 w-4" />
            Testar DDS (HTML)
          </button>
          <button
            onClick={testarLRO}
            className="flex items-center gap-2 rounded-lg border border-aviation-200 bg-aviation-50 px-3 py-2 text-sm font-medium text-aviation-700 hover:bg-aviation-100 dark:border-aviation-700 dark:bg-aviation-900/20 dark:text-aviation-300 dark:hover:bg-aviation-900/30"
          >
            <FileDown className="h-4 w-4" />
            Testar LRO (HTML)
          </button>
          <button
            onClick={() => setShowVars(true)}
            className="flex items-center gap-2 rounded-lg border border-graphite-200 bg-white px-3 py-2 text-sm font-medium text-graphite-700 hover:bg-graphite-50 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-200 dark:hover:bg-graphite-700"
          >
            <FileText className="h-4 w-4" />
            Ver variáveis do template
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            placeholder="Pesquisar em todos os documentos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-graphite-200 bg-white py-2 pl-9 pr-3 text-sm text-graphite-900 placeholder-graphite-400 focus:border-aviation-500 focus:outline-none dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100 dark:placeholder-graphite-500"
          />
        </div>
        <select
          value={filterYear}
          onChange={e => setFilterYear(Number(e.target.value))}
          className="rounded-lg border border-graphite-200 bg-white px-3 py-2 text-sm text-graphite-700 focus:border-aviation-500 focus:outline-none dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-200"
        >
          {anos.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(Number(e.target.value))}
          className="rounded-lg border border-graphite-200 bg-white px-3 py-2 text-sm text-graphite-700 focus:border-aviation-500 focus:outline-none dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-200"
        >
          <option value={-1}>Todos os meses</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-graphite-200 bg-white px-3 py-2 text-sm text-graphite-700 focus:border-aviation-500 focus:outline-none dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-200"
        >
          <option value="all">Todos os status</option>
          <option value="signed">Assinado</option>
          <option value="pending">Aguardando</option>
          <option value="cancelled">Cancelado</option>
          <option value="draft">Rascunho</option>
        </select>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-graphite-300 bg-graphite-50 py-16 text-center dark:border-graphite-600 dark:bg-graphite-800/50">
          <Archive className="mx-auto mb-3 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <p className="text-graphite-500 dark:text-graphite-400">
            Nenhum documento encontrado.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grupos.map(g => {
            const drafts = g.fills.filter(f => f.status === 'draft').length;
            const pendentes = g.fills.filter(f => f.status === 'pending').length;
            const assinados = g.fills.filter(f => f.status === 'signed').length;
            const cancelados = g.fills.filter(f => f.status === 'cancelled').length;

            const linkTarget = g.doc.source_module && TIPO_ICONS[g.doc.source_module]
              ? `/arquivo/${g.doc.source_module}`
              : undefined;

            if (linkTarget) {
              return (
                <Link
                  key={g.doc.id}
                  to={linkTarget}
                  className="group w-full rounded-xl border border-graphite-200 bg-white p-5 text-left shadow-sm transition-all hover:border-aviation-300 hover:shadow-md dark:border-graphite-600 dark:bg-graphite-800 dark:hover:border-aviation-600"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-aviation-50 dark:bg-aviation-900/30">
                      <FileText className="h-6 w-6 text-aviation-600 dark:text-aviation-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-graphite-900 dark:text-graphite-100">{g.doc.name}</h3>
                      <p className="text-sm text-graphite-400 dark:text-graphite-500">
                        {g.fills.length} documento{g.fills.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {drafts > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"><Clock className="h-3 w-3" /> {drafts} rascunho{drafts !== 1 ? 's' : ''}</span>}
                    {pendentes > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><Clock className="h-3 w-3" /> {pendentes} aguardando</span>}
                    {assinados > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"><CheckCircle className="h-3 w-3" /> {assinados} assinado{assinados !== 1 ? 's' : ''}</span>}
                    {cancelados > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300"><XCircle className="h-3 w-3" /> {cancelados} cancelado{cancelados !== 1 ? 's' : ''}</span>}
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={g.doc.id}
                className="w-full rounded-xl border border-graphite-200 bg-white p-5 text-left shadow-sm dark:border-graphite-600 dark:bg-graphite-800"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-aviation-50 dark:bg-aviation-900/30">
                    <FileText className="h-6 w-6 text-aviation-600 dark:text-aviation-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-graphite-900 dark:text-graphite-100">{g.doc.name}</h3>
                    <p className="text-sm text-graphite-400 dark:text-graphite-500">
                      {g.fills.length} documento{g.fills.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {drafts > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"><Clock className="h-3 w-3" /> {drafts} rascunho{drafts !== 1 ? 's' : ''}</span>}
                  {pendentes > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><Clock className="h-3 w-3" /> {pendentes} aguardando</span>}
                  {assinados > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"><CheckCircle className="h-3 w-3" /> {assinados} assinado{assinados !== 1 ? 's' : ''}</span>}
                  {cancelados > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300"><XCircle className="h-3 w-3" /> {cancelados} cancelado{cancelados !== 1 ? 's' : ''}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>

      {showVars && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowVars(false)}>
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-graphite-800" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-graphite-900 dark:text-graphite-100">Variáveis do Template</h3>
              <button onClick={() => setShowVars(false)} className="rounded-lg p-1 text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-700">✕</button>
            </div>
            <p className="mb-3 text-sm text-graphite-500 dark:text-graphite-400">
              No HTML, use {'{{variavel}}'} para marcar campos preenchíveis.
            </p>
            <div className="space-y-1.5">
              {extrairVariaveis(TEMPLATE_DDS).map(v => (
                <div key={v} className="flex items-center gap-3 rounded-lg border border-graphite-100 bg-graphite-50 px-3 py-2 dark:border-graphite-700 dark:bg-graphite-700/50">
                  <code className="rounded bg-aviation-100 px-2 py-0.5 text-sm font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                    {'{{' + v + '}}'}
                  </code>
                  <span className="text-sm text-graphite-500 dark:text-graphite-400">
                    {v === 'logo' ? 'URL da logo (opcional)' :
                     v === 'data' ? 'Data do documento' :
                     v === 'horario' ? 'Horário' :
                     v === 'facilitador' ? 'Nome do facilitador' :
                     v === 'tema' ? 'Tema' :
                     v === 'conteudo' ? 'Conteúdo principal (expande automaticamente)' :
                     v === 'participantes' ? 'Lista de participantes' :
                     'Valor a ser preenchido'}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-graphite-400 dark:text-graphite-500">
              Crie seu próprio HTML com qualquer estrutura e use {'{{variavel}}'} nos campos.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
