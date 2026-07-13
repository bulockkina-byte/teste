import { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Flame, Droplets, Search, ClipboardCheck, Check, X, CalendarDays, Users, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarExtintores } from '../../services/extintorService';
import { listarHidrantes } from '../../services/hidranteService';
import { listarBombeiros } from '../../services/bombeiroService';
import { criarConferencia, listarConferencias } from '../../services/conferenciaService';
import type { Extintor } from '../../types/extintor';
import type { Hidrante } from '../../types/hidrante';
import type { Bombeiro } from '../../types/bombeiro';
import type { ItemChecklist, StatusItemChecklist } from '../../types/conferencia';
import { CHECKLIST_EXTINTOR, CHECKLIST_HIDRANTE, STATUS_ITEM_CHECKLIST_OPTIONS } from '../../types/conferencia';
import type { Equipe } from '../../types/bombeiro';
import { EQUIPE_OPTIONS } from '../../types/bombeiro';

type Tab = 'extintores' | 'hidrantes';
type Step = 'lista' | 'checklist' | 'sucesso';

const INPUT_CLASS = "w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:hover:border-graphite-500 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated dark:focus:ring-aviation-400/10 dark:scheme-dark";

const CARGO_ABBREV: Record<string, string> = {
  'BA-2': 'BA2',
  'BA-MC': 'MC',
  'BA-CE': 'CE',
  'BA-LR': 'LR',
  'BA-RE': 'RE',
  'GS': 'GS',
  'OC': 'OC',
};

function calcularDataProxima(dataAtual: Date, meses: number): string {
  const d = new Date(dataAtual);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().split('T')[0];
}

export function Inspecoes() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('extintores');
  const [termo, setTermo] = useState('');
  const [extintores, setExtintores] = useState<Extintor[]>([]);
  const [hidrantes, setHidrantes] = useState<Hidrante[]>([]);
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [step, setStep] = useState<Step>('lista');
  const [equipamento, setEquipamento] = useState<Extintor | Hidrante | null>(null);
  const [itens, setItens] = useState<ItemChecklist[]>([]);
  const [equipeSelecionada, setEquipeSelecionada] = useState<Equipe | ''>('');
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Bombeiro | null>(null);
  const [buscaPessoa, setBuscaPessoa] = useState('');
  const [pessoaOpen, setPessoaOpen] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState<'Aprovado' | 'Reprovado' | null>(null);
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);
  const [dataProxima, setDataProxima] = useState('');
  const [conferencias, setConferencias] = useState<any[]>([]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const [e, h, b, c] = await Promise.all([
      listarExtintores(),
      listarHidrantes(),
      listarBombeiros(),
      listarConferencias(),
    ]);
    setExtintores(e);
    setHidrantes(h);
    setBombeiros(b);
    setConferencias(c);
  }

  const listaEquipamentos = tab === 'extintores' ? extintores : hidrantes;
  const filtrados = listaEquipamentos.filter(i => {
    if (!termo) return true;
    const t = termo.toLowerCase();
    if (tab === 'extintores') {
      const e = i as Extintor;
      return (e.numeroSerie || '').toLowerCase().includes(t) ||
        (e.numeroExtintor || '').toLowerCase().includes(t) ||
        (e.localizacao || '').toLowerCase().includes(t);
    }
    const h = i as Hidrante;
    return (h.numero || '').toLowerCase().includes(t) ||
      (h.localizacao || '').toLowerCase().includes(t);
  });

  const bombeirosFiltrados = useMemo(() => {
    let lista = bombeiros;
    if (equipeSelecionada) {
      lista = lista.filter(b => b.equipe === equipeSelecionada);
    }
    if (buscaPessoa) {
      const t = buscaPessoa.toLowerCase();
      lista = lista.filter(b =>
        (b.nomeGuerra || '').toLowerCase().includes(t) ||
        (b.nomeCompleto || '').toLowerCase().includes(t) ||
        (CARGO_ABBREV[b.cargo] || '').toLowerCase().includes(t)
      );
    }
    return lista;
  }, [bombeiros, equipeSelecionada, buscaPessoa]);

  function getLabel(item: Extintor | Hidrante): string {
    if (tab === 'extintores') {
      const e = item as Extintor;
      return e.numeroExtintor || e.numeroSerie || 'Sem identificação';
    }
    const h = item as Hidrante;
    return h.numero || 'Sem identificação';
  }

  function getSublabel(item: Extintor | Hidrante): string {
    if (tab === 'extintores') {
      const e = item as Extintor;
      return `${e.localizacao}${e.capacidade ? ` · ${e.capacidade}` : ''}${e.tipo ? ` · ${e.tipo}` : ''}`;
    }
    const h = item as Hidrante;
    return `${h.localizacao}${h.pressao ? ` · ${h.pressao}` : ''}${h.tipo ? ` · ${h.tipo}` : ''}`;
  }

  function iniciarChecklist(item: Extintor | Hidrante) {
    const checklist = tab === 'extintores' ? CHECKLIST_EXTINTOR : CHECKLIST_HIDRANTE;
    setEquipamento(item);
    setItens(checklist.map((pergunta, idx) => ({
      id: `${tab}-${idx}`,
      pergunta,
      status: 'OK' as StatusItemChecklist,
      observacao: '',
    })));
    setEquipeSelecionada('');
    setPessoaSelecionada(null);
    setBuscaPessoa('');
    setPessoaOpen(false);
    setResultadoFinal(null);
    setObs('');
    setDataProxima('');
    setStep('checklist');
  }

  function updateItemStatus(idx: number, status: StatusItemChecklist) {
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, status } : item));
  }

  function updateItemObs(idx: number, observacao: string) {
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, observacao } : item));
  }

  function avaliarResultado() {
    const temPendencia = itens.some(i => i.status === 'Pendência');
    setResultadoFinal(temPendencia ? 'Reprovado' : 'Aprovado');
  }

  function getIntervaloMeses(): number {
    if (!equipamento) return 6;
    if (tab === 'extintores') {
      return parseInt((equipamento as Extintor).intervaloConferencia) || 6;
    }
    return parseInt((equipamento as Hidrante).intervaloConferencia) || 6;
  }

  async function handleSalvar() {
    if (!equipamento || !pessoaSelecionada || !resultadoFinal || !user) return;
    setSaving(true);
    try {
      const now = new Date();
      const meses = getIntervaloMeses();
      const proxima = calcularDataProxima(now, meses);
      setDataProxima(proxima);

      await criarConferencia({
        tipo: tab === 'extintores' ? 'Extintor' : 'Hidrante',
        itemId: equipamento.id,
        itemNome: getLabel(equipamento),
        itemNumero: tab === 'extintores' ? (equipamento as Extintor).numeroExtintor || (equipamento as Extintor).numeroSerie : (equipamento as Hidrante).numero,
        itemLocalizacao: equipamento.localizacao,
        dataConferencia: now.toISOString(),
        inspetorUsername: user.username || '',
        inspetorNomeGuerra: pessoaSelecionada.nomeGuerra,
        inspetorCargo: CARGO_ABBREV[pessoaSelecionada.cargo] || pessoaSelecionada.cargo,
        equipe: pessoaSelecionada.equipe,
        itens,
        resultadoFinal,
        observacoes: obs,
        dataProximaInspecao: proxima,
        createdBy: user.username || '',
      });
      setStep('sucesso');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar inspeção');
    } finally {
      setSaving(false);
    }
  }

  function voltarLista() {
    setStep('lista');
    setEquipamento(null);
    setItens([]);
    setEquipeSelecionada('');
    setPessoaSelecionada(null);
    setResultadoFinal(null);
    setObs('');
    setDataProxima('');
  }

  const concluidos = itens.filter(i => i.status !== 'OK').length;

  return (
    <PageContainer>
      <div className="mb-6">
        <PageTitle icon={ShieldCheck} title="Inspeções Operacionais" />
      </div>

      {step === 'lista' && (
        <>
          <div className="mb-6 flex items-center gap-1 rounded-xl border border-graphite-200/60 bg-graphite-50/80 p-1 dark:border-border-dark dark:bg-surface-card/50">
            {([
              { key: 'extintores' as Tab, label: 'Extintores', icon: Flame, count: extintores.length },
              { key: 'hidrantes' as Tab, label: 'Hidrantes', icon: Droplets, count: hidrantes.length },
            ]).map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setTermo(''); }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  tab === t.key
                    ? 'bg-white text-aviation-700 shadow-sm dark:bg-graphite-900 dark:text-aviation-300'
                    : 'text-graphite-500 hover:text-graphite-700 dark:text-graphite-400 dark:hover:text-graphite-200'
                }`}>
                <t.icon className="h-4 w-4" />
                {t.label}
                <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
                  tab === t.key
                    ? 'bg-aviation-100 text-aviation-700 dark:bg-aviation-900/40 dark:text-aviation-300'
                    : 'bg-graphite-200/60 text-graphite-500 dark:bg-surface-hover/40 dark:text-graphite-400'
                }`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
              <input type="text" value={termo} onChange={e => setTermo(e.target.value)}
                placeholder={tab === 'extintores' ? 'Pesquisar por nº série, nº extintor, localização...' : 'Pesquisar por nº hidrante, localização...'}
                className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-graphite-700" />
            </div>
          </div>

          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
              {tab === 'extintores'
                ? <Flame className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
                : <Droplets className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
              }
              <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
                Nenhum {tab === 'extintores' ? 'extintor' : 'hidrante'} encontrado
              </h3>
              <p className="text-sm text-graphite-400">
                Cadastre {tab === 'extintores' ? 'extintores' : 'hidrantes'} no menu Cadastro primeiro.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtrados.map(item => (
                <div key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-graphite-200/60 bg-white/80 p-4 transition-all duration-200 hover:shadow-md dark:border-border-dark dark:bg-surface-card">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      tab === 'extintores'
                        ? 'bg-gradient-to-br from-red-500 to-red-700 text-white'
                        : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
                    }`}>
                      {tab === 'extintores' ? <Flame className="h-5 w-5" /> : <Droplets className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-graphite-900 dark:text-graphite-100 truncate">{getLabel(item)}</p>
                      <p className="text-xs text-graphite-500 dark:text-graphite-400 truncate">{getSublabel(item)}</p>
                    </div>
                  </div>
                  <button onClick={() => iniciarChecklist(item)}
                    className="shrink-0 flex items-center gap-1.5 rounded-xl bg-aviation-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-aviation-700 dark:bg-aviation-500 dark:hover:bg-aviation-600">
                    <ClipboardCheck className="h-4 w-4" /> Conferir
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {step === 'checklist' && equipamento && (
        <div>
          <button onClick={voltarLista} className="mb-4 flex items-center gap-1 text-sm text-graphite-500 hover:text-graphite-700 dark:text-graphite-400 dark:hover:text-graphite-200">
            <ChevronDown className="h-4 w-4 rotate-90" /> Voltar à lista
          </button>

          <div className="mb-6 rounded-2xl border border-graphite-200/60 bg-white/80 p-5 dark:border-border-dark dark:bg-surface-card">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                tab === 'extintores'
                  ? 'bg-gradient-to-br from-red-500 to-red-700 text-white'
                  : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
              }`}>
                {tab === 'extintores' ? <Flame className="h-6 w-6" /> : <Droplets className="h-6 w-6" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{getLabel(equipamento)}</h2>
                <p className="text-sm text-graphite-500 dark:text-graphite-400">{getSublabel(equipamento)}</p>
              </div>
            </div>
          </div>

          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">
            Checklist de Inspeção ({itens.length} itens)
          </h3>

          <div className="space-y-2 mb-6">
            {itens.map((item, idx) => (
              <div key={item.id} className="rounded-xl border border-graphite-200/60 bg-white/80 p-4 dark:border-border-dark dark:bg-surface-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">
                    <span className="mr-2 text-graphite-400 dark:text-graphite-500">{idx + 1}.</span>
                    {item.pergunta}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-6">
                  {STATUS_ITEM_CHECKLIST_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => updateItemStatus(idx, o.value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        item.status === o.value
                          ? o.color
                          : 'border-graphite-200 bg-white text-graphite-400 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-500'
                      }`}>
                      {item.status === o.value && <Check className="mr-1 inline h-3 w-3" />}
                      {o.label}
                    </button>
                  ))}
                </div>
                {item.status === 'Pendência' && (
                  <input type="text" value={item.observacao} onChange={e => updateItemObs(idx, e.target.value)}
                    placeholder="Descreva a pendência..."
                    className="mt-2 ml-6 w-full max-w-md rounded-lg border border-graphite-300/60 bg-white/70 px-3 py-1.5 text-xs text-graphite-900 outline-none dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100" />
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-graphite-200/60 bg-white/80 p-5 dark:border-border-dark dark:bg-surface-card mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-graphite-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Equipe e Responsável</h3>
            </div>

            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-semibold text-graphite-500 dark:text-graphite-400">Equipe</label>
              <div className="flex flex-wrap gap-2">
                {EQUIPE_OPTIONS.map(eq => (
                  <button key={eq} onClick={() => { setEquipeSelecionada(eq); setPessoaSelecionada(null); setBuscaPessoa(''); }}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      equipeSelecionada === eq
                        ? 'border-aviation-500 bg-aviation-50 text-aviation-700 dark:border-aviation-400 dark:bg-aviation-900/30 dark:text-aviation-300'
                        : 'border-graphite-200 bg-white text-graphite-600 hover:border-graphite-300 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-300'
                    }`}>
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            {equipeSelecionada && (
              <div className="relative">
                <label className="mb-1.5 block text-xs font-semibold text-graphite-500 dark:text-graphite-400">Pessoa Responsável</label>
                <button onClick={() => setPessoaOpen(!pessoaOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
                  {pessoaSelecionada ? (
                    <span>
                      <span className="font-semibold">{pessoaSelecionada.nomeGuerra}</span>
                      <span className="ml-2 text-graphite-500 dark:text-graphite-400">
                        [{CARGO_ABBREV[pessoaSelecionada.cargo] || pessoaSelecionada.cargo}]
                      </span>
                    </span>
                  ) : (
                    <span className="text-graphite-400">Selecione a pessoa...</span>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${pessoaOpen ? 'rotate-180' : ''}`} />
                </button>

                {pessoaOpen && (
                  <div className="absolute z-30 mt-1 w-full rounded-xl border border-graphite-200 bg-white shadow-lg dark:border-border-dark dark:bg-surface-elevated">
                    <div className="p-2 border-b border-graphite-100 dark:border-border-dark">
                      <input type="text" value={buscaPessoa} onChange={e => setBuscaPessoa(e.target.value)}
                        placeholder="Buscar por nome de guerra ou cargo..."
                        className="w-full rounded-lg border border-graphite-300/60 bg-white px-3 py-2 text-sm text-graphite-900 outline-none dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100"
                        autoFocus />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {bombeirosFiltrados.map(b => (
                        <button key={b.id} onClick={() => { setPessoaSelecionada(b); setPessoaOpen(false); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-graphite-50 dark:hover:bg-surface-hover">
                          <span className="font-semibold text-graphite-900 dark:text-graphite-100">{b.nomeGuerra}</span>
                          <span className="text-xs text-graphite-500 dark:text-graphite-400">[{CARGO_ABBREV[b.cargo] || b.cargo}]</span>
                          <span className="ml-auto text-xs text-graphite-400 dark:text-graphite-500">{b.equipe}</span>
                        </button>
                      ))}
                      {bombeirosFiltrados.length === 0 && (
                        <p className="px-3 py-2 text-sm text-graphite-400">Nenhum bombeiro encontrado</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Observações Gerais</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} className={INPUT_CLASS} rows={2} placeholder="Observações adicionais..." />
          </div>

          {concluidos > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-orange-50 p-3 text-sm text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
              <Info className="h-4 w-4" />
              {concluidos} {concluidos === 1 ? 'item com pendência' : 'itens com pendência'} — resultado será <strong>Reprovado</strong>
            </div>
          )}

          <button onClick={async () => { avaliarResultado(); }}
            disabled={!pessoaSelecionada || saving}
            className="w-full rounded-xl bg-aviation-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-aviation-700 disabled:opacity-50 dark:bg-aviation-500 dark:hover:bg-aviation-600">
            Finalizar Inspeção
          </button>

          {resultadoFinal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={() => setResultadoFinal(null)}>
              <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl md:rounded-2xl dark:bg-surface-elevated" onClick={e => e.stopPropagation()}>
                <h3 className="mb-4 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar Inspeção</h3>

                <div className={`mb-4 rounded-xl p-4 ${resultadoFinal === 'Aprovado'
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <p className={`text-lg font-bold ${resultadoFinal === 'Aprovado'
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                  }`}>
                    {resultadoFinal === 'Aprovado' ? '✓ APROVADO' : '✗ REPROVADO'}
                  </p>
                  {resultadoFinal === 'Aprovado' && (
                    <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                      Próxima inspeção: <strong>{calcularDataProxima(new Date(), getIntervaloMeses()).split('-').reverse().join('/')}</strong>
                    </p>
                  )}
                  {resultadoFinal === 'Reprovado' && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      Correções necessárias antes da próxima inspeção
                    </p>
                  )}
                </div>

                <div className="mb-2 text-sm text-graphite-600 dark:text-graphite-400">
                  <p><strong>Responsável:</strong> {pessoaSelecionada?.nomeGuerra} [{CARGO_ABBREV[pessoaSelecionada?.cargo || '']}]</p>
                  <p><strong>Equipe:</strong> {equipeSelecionada}</p>
                  <p><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                <div className="flex gap-3 mt-4">
                  <button onClick={() => setResultadoFinal(null)} className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-graphite-600 transition-colors hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover">
                    Corrigir
                  </button>
                  <button onClick={handleSalvar} disabled={saving}
                    className="flex-1 rounded-xl bg-aviation-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-aviation-700 disabled:opacity-50 dark:bg-aviation-500 dark:hover:bg-aviation-600">
                    {saving ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'sucesso' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-green-200/60 bg-green-50/50 p-12 text-center dark:border-green-800/30 dark:bg-green-900/10">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-green-700 dark:text-green-400">Inspeção Registrada!</h3>
          <p className="mb-1 text-sm text-graphite-600 dark:text-graphite-400">
            {equipamento ? getLabel(equipamento) : ''} — {resultadoFinal}
          </p>
          {dataProxima && (
            <div className="mt-3 rounded-xl bg-white/80 px-4 py-3 dark:bg-surface-card">
              <div className="flex items-center gap-2 text-sm text-graphite-700 dark:text-graphite-300">
                <CalendarDays className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
                Próxima inspeção: <strong>{dataProxima.split('-').reverse().join('/')}</strong>
              </div>
            </div>
          )}
          <button onClick={voltarLista}
            className="mt-6 rounded-xl bg-aviation-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-aviation-700 dark:bg-aviation-500 dark:hover:bg-aviation-600">
            Nova Inspeção
          </button>
        </div>
      )}
    </PageContainer>
  );
}

export default Inspecoes;
