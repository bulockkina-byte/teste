import { useState, useEffect, useMemo } from 'react';
import { Users, Search, AlertCircle, X, Calendar, Shield, Droplets, User, Hash, IdCard, Car, Briefcase, Clock, FileText, Radio, Mail, ArrowLeftRight, ArrowRight } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarBombeiros, buscarBombeiro } from '../../services/bombeiroService';
import { listarAPOCs, buscarAPOC } from '../../services/apocService';
import type { Bombeiro } from '../../types/bombeiro';
import type { APOC } from '../../types/apoc';
import { CARGO_OPTIONS, EQUIPE_OPTIONS } from '../../types/bombeiro';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';
import { SearchSelect } from '../../components/ui/SearchSelect';
import type { SubstituicaoTemporaria, MotivoSubstituicao } from '../../types/substituicaoTemporaria';
import { MOTIVOS_SUBSTITUICAO, STATUS_SUBSTITUICAO_CORES } from '../../types/substituicaoTemporaria';
import {
  listarSubstituicoesTemporarias,
  criarSubstituicaoTemporaria,
  aprovarSubstituicaoTemporaria,
  rejeitarSubstituicaoTemporaria,
  excluirSubstituicaoTemporaria,
} from '../../services/substituicaoTemporariaService';

type Tab = 'todos' | 'bombeiros' | 'apoc' | 'substituicoes';

function capitalize(str: string) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

function labelCargo(valor: string) {
  const found = CARGO_OPTIONS.find(o => o.value === valor);
  return found ? found.label : valor;
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-BR');
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-2xl bg-gradient-to-br from-aviation-50 to-aviation-100 p-1.5 shadow-sm dark:from-aviation-900/30 dark:to-aviation-800/20">
        <Icon className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
      </div>
      <div>
        <p className="text-xs text-graphite-500 dark:text-graphite-400">{label}</p>
        <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{value || '-'}</p>
      </div>
    </div>
  );
}

function BombeiroDetailModal({ bombeiro, onClose }: { bombeiro: Bombeiro; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10 pb-10" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white/95 shadow-2xl shadow-black/5 backdrop-blur-sm dark:bg-surface-elevated/95 dark:shadow-black/20" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-graphite-200 px-6 py-4 dark:border-border-dark">
          <div className="flex items-center gap-3">
            {bombeiro.foto ? (
              <img src={bombeiro.foto} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-aviation-600 text-sm font-bold text-white">
                {bombeiro.nomeGuerra.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{capitalize(bombeiro.nomeCompleto)}</h2>
              <p className="text-sm text-graphite-500">{capitalize(bombeiro.nomeGuerra)} · {bombeiro.matricula}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">Informações Pessoais</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <InfoRow icon={Mail} label="E-mail" value={bombeiro.email} />
              <InfoRow icon={IdCard} label="CPF" value={bombeiro.cpf} />
              <InfoRow icon={IdCard} label="RG" value={bombeiro.rg} />
              <InfoRow icon={Car} label="CNH" value={bombeiro.cnhNumero} />
              <InfoRow icon={Car} label="Cat. CNH" value={bombeiro.cnhCategoria} />
              <InfoRow icon={Calendar} label="Validade CNH" value={formatDate(bombeiro.cnhValidade)} />
              <InfoRow icon={Droplets} label="Tipo Sanguíneo" value={bombeiro.tipoSanguineo} />
            </div>
          </div>

          <div className="border-t border-graphite-200 dark:border-border-dark" />

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">Dados Funcionais</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <InfoRow icon={Hash} label="Matrícula MMS" value={bombeiro.matricula} />
              <InfoRow icon={User} label="Nome de Guerra" value={capitalize(bombeiro.nomeGuerra)} />
              <InfoRow icon={Calendar} label="Nascimento" value={formatDate(bombeiro.dataNascimento)} />
              <InfoRow icon={Calendar} label="Idade" value={String(bombeiro.idade)} />
              <InfoRow icon={Calendar} label="Admissão" value={formatDate(bombeiro.dataAdmissao)} />
              <InfoRow icon={Briefcase} label="Cargo" value={labelCargo(bombeiro.cargo)} />
              <InfoRow icon={Shield} label="Equipe" value={bombeiro.equipe} />
              <InfoRow icon={Clock} label="Turno" value={bombeiro.turno} />
              <InfoRow icon={FileText} label="Situação" value={bombeiro.dataDesligamento ? 'Desligado' : 'Ativo'} />
            </div>
          </div>

          {bombeiro.dataDesligamento && (
            <>
              <div className="border-t border-graphite-200 dark:border-border-dark" />
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-alert-red">Desligamento</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InfoRow icon={Calendar} label="Data de Desligamento" value={formatDate(bombeiro.dataDesligamento)} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function APOCDetailModal({ apoc, onClose }: { apoc: APOC; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10 pb-10" onClick={onClose}>
      <div className="relative w-full max-w-xl rounded-2xl bg-white/95 shadow-2xl shadow-black/5 backdrop-blur-sm dark:bg-surface-elevated/95 dark:shadow-black/20" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-graphite-200 px-6 py-4 dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white shadow-lg shadow-aviation-500/20">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{capitalize(apoc.nomeCompleto)}</h2>
              <p className="text-sm text-graphite-500">{capitalize(apoc.nomeGuerra)}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">Dados do APOC</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoRow icon={User} label="Nome Completo" value={capitalize(apoc.nomeCompleto)} />
              <InfoRow icon={User} label="Nome de Guerra" value={capitalize(apoc.nomeGuerra)} />
              <InfoRow icon={Mail} label="E-mail" value={apoc.email} />
              <InfoRow icon={Radio} label="Função" value={apoc.funcao} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'todos', label: 'Todos', icon: Users },
  { key: 'bombeiros', label: 'Bombeiros', icon: Shield },
  { key: 'apoc', label: 'APOC', icon: Radio },
  { key: 'substituicoes', label: 'Substituições', icon: ArrowLeftRight },
];

const INPUT_CLASS = "rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm text-graphite-700 outline-none transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-200 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated dark:focus:text-graphite-100 dark:scheme-dark";

export function Funcionarios() {
  const { user, effectiveRole } = useAuth();

  const [tab, setTab] = useState<Tab>('todos');
  const [termo, setTermo] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [selecionado, setSelecionado] = useState<Bombeiro | APOC | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<'bombeiro' | 'apoc'>('bombeiro');

  const [allBombeiros, setAllBombeiros] = useState<Bombeiro[]>([]);
  const [allApocs, setAllApocs] = useState<APOC[]>([]);
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [apocs, setApocs] = useState<APOC[]>([]);

  const [allSubstituicoes, setAllSubstituicoes] = useState<SubstituicaoTemporaria[]>([]);
  const [subView, setSubView] = useState<'lista' | 'nova'>('lista');
  const [filterStatusSub, setFilterStatusSub] = useState('');
  const [formSubstituido, setFormSubstituido] = useState<Bombeiro | null>(null);
  const [formSubstituto, setFormSubstituto] = useState<Bombeiro | null>(null);
  const [formMotivo, setFormMotivo] = useState<MotivoSubstituicao>('Atestado Medico');
  const [formMotivoOutro, setFormMotivoOutro] = useState('');
  const [formDias, setFormDias] = useState(15);
  const [formDataInicio, setFormDataInicio] = useState('');
  const [loadingSub, setLoadingSub] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const debouncedTermo = useDebounce(termo, 400);

  const canApprove = effectiveRole === 'admin_master' || effectiveRole === 'admin' || effectiveRole === 'gerente';

  useEffect(() => {
    async function load() {
      setAllBombeiros(await listarBombeiros());
    }
    load();
  }, []);

  useEffect(() => {
    async function load() {
      setAllApocs(await listarAPOCs());
    }
    load();
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setAllSubstituicoes(await listarSubstituicoesTemporarias());
      } catch { /* ignore */ }
    }
    load();
  }, []);

  useEffect(() => {
    async function load() {
      let lista = debouncedTermo ? await buscarBombeiro(debouncedTermo) : allBombeiros;
      if (filterEquipe) lista = lista.filter(b => b.equipe === filterEquipe);
      if (filterCargo) lista = lista.filter(b => b.cargo === filterCargo);
      setBombeiros(lista);
    }
    load();
  }, [debouncedTermo, filterEquipe, filterCargo, allBombeiros]);

  useEffect(() => {
    async function load() {
      if (!debouncedTermo) {
        setApocs(allApocs);
        return;
      }
      setApocs(await buscarAPOC(debouncedTermo));
    }
    load();
  }, [debouncedTermo, allApocs]);

  useEffect(() => {
    if (formMotivo !== 'Outro') {
      const found = MOTIVOS_SUBSTITUICAO.find(m => m.value === formMotivo);
      if (found) setFormDias(found.dias);
    }
  }, [formMotivo]);

  const dataFimCalculada = useMemo(() => {
    if (!formDataInicio || formDias <= 0) return '';
    const parts = formDataInicio.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + formDias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [formDataInicio, formDias]);

  const substituicaoFuncao = formSubstituido?.cargo || '';

  const formValid = !!(
    formSubstituido &&
    formSubstituto &&
    formSubstituido.id !== formSubstituto.id &&
    formDataInicio &&
    formDias > 0 &&
    (formMotivo !== 'Outro' || formMotivoOutro.trim())
  );

  const filteredSubstituicoes = allSubstituicoes.filter(sub =>
    filterStatusSub === '' || sub.status === filterStatusSub
  );

  const filteredBombeiros = tab === 'apoc' ? [] : bombeiros;
  const filteredApocs = tab === 'bombeiros' ? [] : apocs;
  const totalRegistros = filteredBombeiros.length + filteredApocs.length;

  function getTabCount(key: Tab): number {
    if (key === 'todos') return allBombeiros.length + allApocs.length;
    if (key === 'bombeiros') return allBombeiros.length;
    if (key === 'apoc') return allApocs.length;
    return allSubstituicoes.length;
  }

  function handleSelectBombeiro(b: Bombeiro) {
    setSelecionado(b);
    setTipoSelecionado('bombeiro');
  }

  function handleSelectApoc(a: APOC) {
    setSelecionado(a);
    setTipoSelecionado('apoc');
  }

  function resetFormSubstituicao() {
    setFormSubstituido(null);
    setFormSubstituto(null);
    setFormMotivo('Atestado Medico');
    setFormMotivoOutro('');
    setFormDias(15);
    setFormDataInicio('');
  }

  async function handleSubmitSubstituicao() {
    if (!formValid || !formSubstituido || !formSubstituto) return;
    setLoadingSub(true);
    try {
      const nova: Omit<SubstituicaoTemporaria, 'id' | 'createdAt' | 'updatedAt'> = {
        funcionarioId: formSubstituido.id,
        funcionarioNome: formSubstituido.nomeCompleto,
        funcionarioCargo: formSubstituido.cargo,
        substitutoId: formSubstituto.id,
        substitutoNome: formSubstituto.nomeCompleto,
        substitutoCargo: substituicaoFuncao,
        motivo: formMotivo,
        motivoOutro: formMotivo === 'Outro' ? formMotivoOutro : '',
        dataInicio: formDataInicio,
        dataFim: dataFimCalculada,
        dias: formDias,
        status: 'Pendente',
        observacoesRejeicao: '',
        criadoPor: user?.username || '',
        criadoPorNome: user?.name || '',
        aprovadoPor: '',
        aprovadoPorNome: '',
        aprovadoEm: '',
      };
      await criarSubstituicaoTemporaria(nova);
      setAllSubstituicoes(await listarSubstituicoesTemporarias());
      resetFormSubstituicao();
      setSubView('lista');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar substituição');
    } finally {
      setLoadingSub(false);
    }
  }

  async function handleAprovarSubstituicao(id: string) {
    try {
      await aprovarSubstituicaoTemporaria(id, user?.username || '', user?.name || '');
      setAllSubstituicoes(await listarSubstituicoesTemporarias());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao aprovar');
    }
  }

  async function handleConfirmRejeitar() {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      await rejeitarSubstituicaoTemporaria(rejectId, user?.username || '', user?.name || '', rejectReason);
      setAllSubstituicoes(await listarSubstituicoesTemporarias());
      setRejectId(null);
      setRejectReason('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao rejeitar');
    }
  }

  async function handleExcluirSubstituicao(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta substituição?')) return;
    try {
      await excluirSubstituicaoTemporaria(id);
      setAllSubstituicoes(await listarSubstituicoesTemporarias());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle icon={Users} title="Funcionários" />
      </div>

      {tab !== 'substituicoes' && (
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
              <input
                type="text"
                value={termo}
                onChange={e => setTermo(e.target.value)}
                placeholder="Pesquisar por matrícula, nome, CPF..."
                className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-graphite-700"
              />
            </div>
            {(tab === 'todos' || tab === 'bombeiros') && (
              <>
                <select
                  value={filterEquipe}
                  onChange={e => setFilterEquipe(e.target.value)}
                  className="rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm text-graphite-700 outline-none transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-200 dark:focus:border-aviation-400/50 dark:focus:bg-graphite-700 dark:focus:text-graphite-100 dark:scheme-dark"
                >
                  <option value="">Todas as Equipes</option>
                  {EQUIPE_OPTIONS.map(e => <option key={e} value={e} className="dark:bg-graphite-700 dark:text-graphite-100">{e}</option>)}
                </select>
                <select
                  value={filterCargo}
                  onChange={e => setFilterCargo(e.target.value)}
                  className="rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm text-graphite-700 outline-none transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-200 dark:focus:border-aviation-400/50 dark:focus:bg-graphite-700 dark:focus:text-graphite-100 dark:scheme-dark"
                >
                  <option value="">Todos os Cargos</option>
                  {CARGO_OPTIONS.map(o => <option key={o.value} value={o.value} className="dark:bg-graphite-700 dark:text-graphite-100">{o.label}</option>)}
                </select>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center gap-1 rounded-xl border border-graphite-200/60 bg-graphite-50/80 p-1 dark:border-border-dark dark:bg-surface-card/50">
        {TABS.map(t => {
          const Icon = t.icon;
          const count = getTabCount(t.key);
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                tab === t.key
                  ? 'bg-white text-aviation-700 shadow-sm dark:bg-graphite-900 dark:text-aviation-300'
                  : 'text-graphite-500 hover:text-graphite-700 dark:text-graphite-400 dark:hover:text-graphite-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
                tab === t.key
                  ? 'bg-aviation-100 text-aviation-700 dark:bg-aviation-900/40 dark:text-aviation-300'
                  : 'bg-graphite-200/60 text-graphite-500 dark:bg-surface-hover40 dark:text-graphite-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'substituicoes' ? (
        <div>
          <div className="mb-6 flex items-center gap-1 rounded-xl border border-graphite-200/60 bg-graphite-50/80 p-1 dark:border-border-dark dark:bg-surface-card/50">
            <button
              onClick={() => setSubView('lista')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                subView === 'lista'
                  ? 'bg-white text-aviation-700 shadow-sm dark:bg-graphite-900 dark:text-aviation-300'
                  : 'text-graphite-500 hover:text-graphite-700 dark:text-graphite-400 dark:hover:text-graphite-200'
              }`}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Substituições
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
                subView === 'lista'
                  ? 'bg-aviation-100 text-aviation-700 dark:bg-aviation-900/40 dark:text-aviation-300'
                  : 'bg-graphite-200/60 text-graphite-500 dark:bg-surface-hover40 dark:text-graphite-400'
              }`}>
                {allSubstituicoes.length}
              </span>
            </button>
            <button
              onClick={() => setSubView('nova')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                subView === 'nova'
                  ? 'bg-white text-aviation-700 shadow-sm dark:bg-graphite-900 dark:text-aviation-300'
                  : 'text-graphite-500 hover:text-graphite-700 dark:text-graphite-400 dark:hover:text-graphite-200'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Nova Substituição
            </button>
          </div>

          {subView === 'nova' ? (
            <div className="rounded-2xl border border-graphite-200/60 bg-white/80 p-6 backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
              <h3 className="mb-6 text-lg font-bold text-graphite-900 dark:text-graphite-100">Nova Substituição Temporária</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-graphite-600 dark:text-graphite-400">Substituído</label>
                  <SearchSelect
                    value={formSubstituido?.nomeGuerra || ''}
                    onChange={(val) => {
                      const found = allBombeiros.find(b => b.nomeGuerra === val);
                      setFormSubstituido(found || null);
                    }}
                    placeholder="Selecione o funcionário..."
                  />
                  {formSubstituido && (
                    <p className="mt-1 text-xs text-graphite-500 dark:text-graphite-400">
                      {capitalize(formSubstituido.nomeCompleto)} · {labelCargo(formSubstituido.cargo)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-graphite-600 dark:text-graphite-400">Substituto</label>
                  <SearchSelect
                    value={formSubstituto?.nomeGuerra || ''}
                    onChange={(val) => {
                      const found = allBombeiros.find(b => b.nomeGuerra === val);
                      setFormSubstituto(found || null);
                    }}
                    placeholder="Selecione o substituto..."
                  />
                  {formSubstituto && (
                    <p className="mt-1 text-xs text-graphite-500 dark:text-graphite-400">
                      {capitalize(formSubstituto.nomeCompleto)} · {labelCargo(formSubstituto.cargo)}
                    </p>
                  )}
                  {formSubstituido && formSubstituto && formSubstituido.id === formSubstituto.id && (
                    <p className="mt-1 text-xs text-alert-red">O substituto não pode ser a mesma pessoa que o substituído.</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-graphite-600 dark:text-graphite-400">Função de Substituição</label>
                  <input
                    type="text"
                    readOnly
                    value={substituicaoFuncao ? labelCargo(substituicaoFuncao) : 'Selecione o substituído primeiro'}
                    className={`${INPUT_CLASS} cursor-default opacity-70`}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-graphite-600 dark:text-graphite-400">Motivo</label>
                  <select
                    value={formMotivo}
                    onChange={e => setFormMotivo(e.target.value as MotivoSubstituicao)}
                    className={INPUT_CLASS}
                  >
                    {MOTIVOS_SUBSTITUICAO.map(m => (
                      <option key={m.value} value={m.value} className="dark:bg-graphite-700 dark:text-graphite-100">
                        {m.label}{m.dias > 0 ? ` (${m.dias} dias)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {formMotivo === 'Outro' && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-graphite-600 dark:text-graphite-400">Descrição do Motivo</label>
                      <input
                        type="text"
                        value={formMotivoOutro}
                        onChange={e => setFormMotivoOutro(e.target.value)}
                        placeholder="Descreva o motivo..."
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-graphite-600 dark:text-graphite-400">Dias</label>
                      <input
                        type="number"
                        min={1}
                        value={formDias}
                        onChange={e => setFormDias(Math.max(1, Number(e.target.value)))}
                        className={INPUT_CLASS}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-graphite-600 dark:text-graphite-400">Data de Saída</label>
                  <input
                    type="date"
                    value={formDataInicio}
                    onChange={e => setFormDataInicio(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-graphite-600 dark:text-graphite-400">Data de Retorno</label>
                  <input
                    type="text"
                    readOnly
                    value={dataFimCalculada ? formatDate(dataFimCalculada) : 'Preencha a data de saída'}
                    className={`${INPUT_CLASS} cursor-default opacity-70`}
                  />
                </div>
              </div>

              {formSubstituido && formSubstituto && formDataInicio && dataFimCalculada && (
                <div className="mt-6 rounded-xl border border-graphite-200/60 bg-graphite-50/80 p-4 dark:border-border-dark dark:bg-surface-card/50">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">Resumo da Substituição</h4>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-graphite-900 dark:text-graphite-100">{capitalize(formSubstituido.nomeGuerra)}</p>
                      <p className="text-xs text-graphite-500">{labelCargo(formSubstituido.cargo)}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-aviation-500" />
                    <div className="text-center">
                      <p className="font-semibold text-graphite-900 dark:text-graphite-100">{capitalize(formSubstituto.nomeGuerra)}</p>
                      <p className="text-xs text-graphite-500">assumirá {labelCargo(substituicaoFuncao)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-graphite-500 dark:text-graphite-400">
                    <span>Motivo: <strong>{formMotivo === 'Outro' ? formMotivoOutro : MOTIVOS_SUBSTITUICAO.find(m => m.value === formMotivo)?.label}</strong></span>
                    <span>Período: <strong>{formatDate(formDataInicio)} a {formatDate(dataFimCalculada)}</strong> ({formDias} dias)</span>
                    <span>Status: <span className="inline-flex rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">Pendente</span></span>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { resetFormSubstituicao(); setSubView('lista'); }}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-graphite-600 transition-colors hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitSubstituicao}
                  disabled={!formValid || loadingSub}
                  className="rounded-xl bg-aviation-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-aviation-700 disabled:opacity-50 dark:bg-aviation-500 dark:hover:bg-aviation-600"
                >
                  {loadingSub ? 'Criando...' : 'Criar Substituição'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <select
                  value={filterStatusSub}
                  onChange={e => setFilterStatusSub(e.target.value)}
                  className={`${INPUT_CLASS} w-auto`}
                >
                  <option value="" className="dark:bg-graphite-700 dark:text-graphite-100">Todos os Status</option>
                  <option value="Pendente" className="dark:bg-graphite-700 dark:text-graphite-100">Pendente</option>
                  <option value="Aprovada" className="dark:bg-graphite-700 dark:text-graphite-100">Aprovada</option>
                  <option value="Rejeitada" className="dark:bg-graphite-700 dark:text-graphite-100">Rejeitada</option>
                </select>
              </div>

              {filteredSubstituicoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
                  <ArrowLeftRight className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
                  <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
                    Nenhuma substituição encontrada
                  </h3>
                  <p className="text-sm text-graphite-400">
                    {filterStatusSub
                      ? 'Nenhuma substituição com este status.'
                      : 'Clique em "Nova Substituição" para criar uma.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSubstituicoes.map(sub => (
                    <div key={sub.id} className="rounded-2xl border border-graphite-200/60 bg-white/80 p-4 backdrop-blur-sm transition-all duration-200 hover:shadow-md dark:border-border-dark dark:bg-surface-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold text-graphite-900 dark:text-graphite-100">{capitalize(sub.funcionarioNome)}</span>
                            <span className="text-xs text-graphite-400">({labelCargo(sub.funcionarioCargo)})</span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-graphite-400" />
                            <span className="font-semibold text-graphite-900 dark:text-graphite-100">{capitalize(sub.substitutoNome)}</span>
                            <span className="text-xs text-graphite-400">({labelCargo(sub.substitutoCargo)})</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-graphite-500 dark:text-graphite-400">
                            <span>{sub.motivo === 'Outro' ? sub.motivoOutro : MOTIVOS_SUBSTITUICAO.find(m => m.value === sub.motivo)?.label}</span>
                            <span>{formatDate(sub.dataInicio)} a {formatDate(sub.dataFim)} ({sub.dias} dias)</span>
                            <span>por {sub.criadoPorNome}</span>
                          </div>
                          {sub.status === 'Rejeitada' && sub.observacoesRejeicao && (
                            <p className="mt-2 text-xs text-alert-red dark:text-red-400">
                              Motivo da rejeição: {sub.observacoesRejeicao}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_SUBSTITUICAO_CORES[sub.status] || ''}`}>
                            {sub.status}
                          </span>
                          {sub.status === 'Pendente' && canApprove && (
                            <>
                              <button
                                onClick={() => handleAprovarSubstituicao(sub.id)}
                                className="rounded-lg bg-status-green/10 px-2.5 py-1 text-xs font-medium text-status-green transition-colors hover:bg-status-green/20"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => setRejectId(sub.id)}
                                className="rounded-lg bg-alert-red/10 px-2.5 py-1 text-xs font-medium text-alert-red transition-colors hover:bg-alert-red/20"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                          {canApprove && (
                            <button
                              onClick={() => handleExcluirSubstituicao(sub.id)}
                              className="rounded-lg p-1 text-graphite-400 transition-colors hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {totalRegistros === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
              <Users className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
              <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
                Nenhum funcionário encontrado
              </h3>
              <p className="text-sm text-graphite-400">
                {tab === 'apoc'
                  ? 'Nenhum membro do APOC cadastrado ainda.'
                  : tab === 'bombeiros'
                    ? 'Nenhum bombeiro cadastrado ainda.'
                    : 'Os funcionários cadastrados nos módulos de Bombeiros e APOC aparecerão aqui.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBombeiros.length > 0 && (tab === 'todos' || tab === 'bombeiros') && (
                <div>
                  {tab === 'todos' && (
                    <div className="mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
                      <h3 className="text-sm font-semibold text-graphite-700 dark:text-graphite-300">
                        Bombeiros ({filteredBombeiros.length})
                      </h3>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-2xl border border-graphite-200/60 bg-white/80 backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-graphite-200 bg-graphite-50 text-left dark:border-border-dark dark:bg-surface-card">
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Matrícula</th>
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome</th>
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome de Guerra</th>
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">E-mail</th>
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Cargo</th>
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Equipe</th>
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Turno</th>
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBombeiros.map(b => (
                          <tr
                            key={b.id}
                            onClick={() => handleSelectBombeiro(b)}
                            className="cursor-pointer border-b border-graphite-100 transition-colors hover:bg-aviation-50/50 dark:border-border-dark dark:hover:bg-aviation-900/20"
                          >
                            <td className="px-4 py-3 font-medium text-graphite-900 dark:text-graphite-100">{b.matricula}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {b.foto && (
                                  <img src={b.foto} alt="" className="h-8 w-8 rounded-full object-cover" />
                                )}
                                <span className="text-graphite-700 dark:text-graphite-300">{capitalize(b.nomeCompleto)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{capitalize(b.nomeGuerra)}</td>
                            <td className="px-4 py-3 text-graphite-500 dark:text-graphite-400 text-xs">{b.email || '-'}</td>
                            <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{labelCargo(b.cargo)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full bg-aviation-50 px-2.5 py-0.5 text-xs font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                                {b.equipe}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{b.turno}</td>
                            <td className="px-4 py-3">
                              {b.dataDesligamento ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-alert-red dark:bg-red-900/20">
                                  <AlertCircle className="h-3 w-3" />
                                  Desligado
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-status-green/10 px-2.5 py-0.5 text-xs font-medium text-status-green">
                                  Ativo
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {filteredApocs.length > 0 && (tab === 'todos' || tab === 'apoc') && (
                <div>
                  {tab === 'todos' && (
                    <div className="mb-3 flex items-center gap-2">
                      <Radio className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
                      <h3 className="text-sm font-semibold text-graphite-700 dark:text-graphite-300">
                        APOC ({filteredApocs.length})
                      </h3>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-2xl border border-graphite-200/60 bg-white/80 backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-graphite-200 bg-graphite-50 text-left dark:border-border-dark dark:bg-surface-card">
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome de Guerra</th>
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome Completo</th>
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">E-mail</th>
                          <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Função</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredApocs.map(a => (
                          <tr
                            key={a.id}
                            onClick={() => handleSelectApoc(a)}
                            className="cursor-pointer border-b border-graphite-100 transition-colors hover:bg-aviation-50/50 dark:border-border-dark dark:hover:bg-aviation-900/20"
                          >
                            <td className="px-4 py-3 font-medium text-graphite-900 dark:text-graphite-100">{capitalize(a.nomeGuerra)}</td>
                            <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{capitalize(a.nomeCompleto)}</td>
                            <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{a.email}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full bg-aviation-50 px-2.5 py-0.5 text-xs font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                                {a.funcao}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selecionado && tipoSelecionado === 'bombeiro' && (
        <BombeiroDetailModal bombeiro={selecionado as Bombeiro} onClose={() => setSelecionado(null)} />
      )}
      {selecionado && tipoSelecionado === 'apoc' && (
        <APOCDetailModal apoc={selecionado as APOC} onClose={() => setSelecionado(null)} />
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setRejectId(null); setRejectReason(''); }}>
          <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur-sm dark:bg-surface-elevated/95 dark:shadow-black/20" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold text-graphite-900 dark:text-graphite-100">Rejeitar Substituição</h3>
            <label className="mb-1.5 block text-xs font-semibold text-graphite-600 dark:text-graphite-400">Motivo da rejeição</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
              className={`${INPUT_CLASS} w-full`}
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setRejectId(null); setRejectReason(''); }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-graphite-600 transition-colors hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRejeitar}
                disabled={!rejectReason.trim()}
                className="rounded-xl bg-alert-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default Funcionarios;
