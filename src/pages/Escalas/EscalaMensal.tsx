import { useState, useEffect, useMemo } from 'react';
import {
  Calendar, ChevronDown, ChevronUp, Save, Copy, Printer,
  Trash2, Radio, Shield, Users, ClipboardList,
  Sparkles, AlertTriangle, Plus, X, Eye, Image,
} from 'lucide-react';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { listarBombeiros } from '../../services/bombeiroService';
import { listarFeriasGozo, listarEscalas as listarEscalasFerias, listarItensEscala } from '../../services/feriasService';
import type { Bombeiro } from '../../types/bombeiro';
import type { FeriasGozo } from '../../types/ferias';
import { useAuth } from '../../context/AuthContext';
import { validarCursoParaFuncao } from '../../utils/validacaoCursos';
import { toPng } from 'html-to-image';
import {
  listarCompletas, novaConfigId, salvarConfig, salvarCompleta,
  obterCompleta, gerarEscalaMensal, clonarConfig, gerarNomesMes,
  excluirConfig,
} from '../../services/escalaMensalService';
import { SLOTS_RADIO, LOCAIS_FAXINA, type EscalaMensalConfig, type EscalaMensalCompleta, type PessoaEscala, type Veiculo, type FuncaoVeiculo } from '../../types/escalaMensal';

const MESES = gerarNomesMes();

interface SlotDef {
  label: string;
  funcao: 'chefe' | 'lider' | 'ba-mc' | 'ba-2';
  veiculo: Veiculo;
  funcaoNoVeiculo: FuncaoVeiculo;
  isRadioFixo: boolean;
  cargoFiltro?: string;
}

const SLOTS: SlotDef[] = [
  { label: 'Chefe de Equipe (BA-CE · CCI F2)', funcao: 'chefe', veiculo: 'cciF2', funcaoNoVeiculo: 'BaCe', isRadioFixo: false, cargoFiltro: 'BA-CE' },
  { label: 'Líder de Resgate (BA-LR · CRS)', funcao: 'lider', veiculo: 'crs', funcaoNoVeiculo: 'BaLr', isRadioFixo: false, cargoFiltro: 'BA-LR' },
  { label: 'Condutor (BA-MC · CRS)', funcao: 'ba-mc', veiculo: 'crs', funcaoNoVeiculo: 'BaMc', isRadioFixo: false, cargoFiltro: 'BA-MC' },
  { label: 'Condutor (BA-MC · CCI F2)', funcao: 'ba-mc', veiculo: 'cciF2', funcaoNoVeiculo: 'BaMc', isRadioFixo: false, cargoFiltro: 'BA-MC' },
  { label: 'Condutor (BA-MC · CCI F3)', funcao: 'ba-mc', veiculo: 'cciF3', funcaoNoVeiculo: 'BaMc', isRadioFixo: false, cargoFiltro: 'BA-MC' },
  { label: 'BA-2 (CRS)', funcao: 'ba-2', veiculo: 'crs', funcaoNoVeiculo: 'Ba2-1', isRadioFixo: false, cargoFiltro: 'BA-2' },
  { label: 'BA-2 (CRS)', funcao: 'ba-2', veiculo: 'crs', funcaoNoVeiculo: 'Ba2-2', isRadioFixo: false, cargoFiltro: 'BA-2' },
  { label: 'BA-2 (CCI F2)', funcao: 'ba-2', veiculo: 'cciF2', funcaoNoVeiculo: 'Ba2', isRadioFixo: false, cargoFiltro: 'BA-2' },
  { label: 'BA-2 (CCI F3)', funcao: 'ba-2', veiculo: 'cciF3', funcaoNoVeiculo: 'Ba2-1', isRadioFixo: false, cargoFiltro: 'BA-2' },
  { label: 'BA-2 (CCI F3 · Rádio Fixo)', funcao: 'ba-2', veiculo: 'cciF3', funcaoNoVeiculo: 'Ba2-2', isRadioFixo: true, cargoFiltro: 'BA-2' },
];

export function EscalaMensal() {
  const { user, effectiveRole } = useAuth();
  const isGlobal = effectiveRole === 'desenvolvedor' || effectiveRole === 'admin' || effectiveRole === 'gerente';

  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [completas, setCompletas] = useState<EscalaMensalCompleta[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'setup' | 'list'>('list');
  const [msg, setMsg] = useState<string | null>(null);

  const [equipe, setEquipe] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [paridade, setParidade] = useState<'par' | 'impar'>('impar');
  const [pessoas, setPessoas] = useState<(Partial<PessoaEscala> | null)[]>(SLOTS.map(() => null));
  const [filterListEquipe, setFilterListEquipe] = useState('');
  const [radioExpanded, setRadioExpanded] = useState(true);
  const [faxinaExpanded, setFaxinaExpanded] = useState(true);

  async function handleExportPNG() {
    const el = document.getElementById('print-area');
    if (!el) return;
    try {
      notificar('Gerando PNG...');
      const dataUrl = await toPng(el, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `${document.title || 'escala-mensal'}.png`;
      link.href = dataUrl;
      link.click();
      notificar('PNG salvo com sucesso!');
    } catch (e) {
      console.error('PNG error:', e);
      notificar('Erro ao gerar PNG: ' + (e instanceof Error ? e.message : 'desconhecido'));
    }
  }

  const userEquipe = useMemo(() => {
    if (!user?.pessoa?.nomeGuerra) return null;
    const b = bombeiros.find(bb => bb.nomeGuerra === user.pessoa!.nomeGuerra);
    return b?.equipe || null;
  }, [user, bombeiros]);

  const equipesDisponiveis = useMemo(() => {
    if (isGlobal) return ['Alfa', 'Bravo', 'Charlie', 'Delta'];
    return userEquipe ? [userEquipe] : [];
  }, [isGlobal, userEquipe]);

  useEffect(() => {
    if (!equipe && userEquipe && !isGlobal) setEquipe(userEquipe);
  }, [userEquipe, isGlobal, equipe]);

  useEffect(() => {
    listarBombeiros().then(setBombeiros).catch(() => {});
    listarCompletas().then(setCompletas).catch(() => {});
  }, []);

  useEffect(() => {
    if (!equipe || !bombeiros.length || pessoas.some(p => p)) return;
    const membros = bombeiros.filter(b => b.equipe === equipe);
    if (membros.length < 10) return;
    const pool = [...membros];
    const find = (funcao: 'chefe' | 'lider' | 'ba-mc' | 'ba-2') => {
      const cargo = funcao === 'chefe' ? 'BA-CE' : funcao === 'lider' ? 'BA-LR' : funcao === 'ba-mc' ? 'BA-MC' : 'BA-2';
      const idx = pool.findIndex(b => b.cargo === cargo);
      if (idx !== -1) return pool.splice(idx, 1)[0];
      return null;
    };
    const novas = SLOTS.map(slot => {
      const b = find(slot.funcao) || pool.shift();
      if (!b) return null;
      return { id: b.id, nome: b.nome, nomeGuerra: b.nomeGuerra, funcao: slot.funcao, veiculo: slot.veiculo, funcaoNoVeiculo: slot.funcaoNoVeiculo, isRadioFixo: slot.isRadioFixo } as Partial<PessoaEscala>;
    });
    setPessoas(novas);
  }, [equipe, bombeiros, pessoas]);

  useEffect(() => {
    const filtradas = isGlobal ? completas : completas.filter(c => c.config.equipe === userEquipe);
    if (filtradas.length > 0 && !selecionada) {
      setSelecionada(filtradas[0].config.id);
    }
  }, [completas, isGlobal, userEquipe, selecionada]);

  const completaAtual = useMemo(() => {
    if (!selecionada) return null;
    return completas.find(c => c.config.id === selecionada) || null;
  }, [selecionada, completas]);

  const veiculosView = useMemo(() => {
    if (!completaAtual || completaAtual.paradas.length === 0) return null;
    const v = completaAtual.paradas[0].veiculos || {} as any;
    const linha = (label: string, nome: string) => `${label}: ${nome}`;
    return (
      <div className="rounded border-2 border-graphite-300 bg-white/80 p-1 print:border-graphite-500 print:bg-white dark:border-border-dark dark:bg-surface-card">
        <div className="flex items-center gap-1 mb-0.5">
          <Shield className="h-3.5 w-3.5 text-aviation-600 print:text-graphite-800" />
          <span className="text-[12px] font-bold text-graphite-800 print:text-graphite-900 dark:text-graphite-200">Guarnições</span>
        </div>
        <div className="flex gap-2">
          {[
            { nome: 'CRS', cor: 'border-blue-400 print:border-blue-600', itens: [linha('BA-MC', v?.crs?.baMc || '-'), linha('BA-LR', v?.crs?.baLr || '-'), linha('BA-2', v?.crs?.ba2_1 || '-'), linha('BA-2', v?.crs?.ba2_2 || '-')] },
            { nome: 'CCI F2', cor: 'border-amber-400 print:border-amber-600', itens: [linha('BA-MC', v?.cciF2?.baMc || '-'), linha('BA-CE', v?.cciF2?.baCe || '-'), linha('BA-2', v?.cciF2?.ba2 || '-')] },
            { nome: 'CCI F3', cor: 'border-emerald-400 print:border-emerald-600', itens: [linha('BA-MC', v?.cciF3?.baMc || '-'), linha('BA-2', v?.cciF3?.ba2_1 || '-'), linha('BA-2', v?.cciF3?.ba2_2 || '-')] },
          ].map(c => (
            <div key={c.nome} className={`flex-1 rounded border-2 ${c.cor} bg-graphite-50/30 px-2 py-0.5 print:bg-white dark:border-border-dark dark:bg-surface-card/30`}>
              <p className="text-[11px] font-bold text-graphite-600 print:text-graphite-700 uppercase">{c.nome}</p>
              {c.itens.map((item, i) => <p key={i} className="text-[11px] font-semibold print:font-bold leading-snug text-graphite-800 print:text-graphite-900 dark:text-graphite-200">{item}</p>)}
            </div>
          ))}
        </div>
      </div>
    );
  }, [completaAtual, bombeiros]);

  const qtdPessoas = pessoas.filter(pessoaValida).length;

  const completasFiltradas = useMemo(() => {
    let lista = completas;
    if (!isGlobal && userEquipe) lista = lista.filter(c => c.config.equipe === userEquipe);
    if (filterListEquipe) lista = lista.filter(c => c.config.equipe === filterListEquipe);
    return lista;
  }, [completas, isGlobal, userEquipe, filterListEquipe]);

  function notificar(texto: string) {
    setMsg(texto);
    setTimeout(() => setMsg(null), 3000);
  }

  function pessoaValida(p: Partial<PessoaEscala> | null): p is PessoaEscala {
    return !!p?.id && !!p?.nomeGuerra;
  }

  async function handleGerar() {
    const validadas = pessoas.filter(pessoaValida);
    if (!equipe) {
      notificar('Selecione uma equipe antes de gerar.');
      return;
    }
    if (validadas.length < 10) {
      notificar(`Preencha todas as 10 pessoas (${validadas.length}/10).`);
      return;
    }

    const cfg: EscalaMensalConfig = {
      id: novaConfigId(),
      equipe, mes, ano, paridade,
      pessoas: validadas,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const completa = gerarEscalaMensal(cfg);
    await Promise.all([salvarConfig(cfg), salvarCompleta(completa)]);

    const c = await listarCompletas();
    setCompletas(c);
    setSelecionada(cfg.id);
    setMode('view');
    notificar(`Escala de ${MESES[mes - 1]}/${ano} gerada!`);
  }

  function handleClone() {
    if (!completaAtual) return;
    const { config: atual } = completaAtual;
    let novoMes = atual.mes + 1;
    let novoAno = atual.ano;
    if (novoMes > 12) { novoMes = 1; novoAno++; }

    setEquipe(atual.equipe);
    setMes(novoMes);
    setAno(novoAno);
    setParidade(atual.paridade);
    setPessoas(atual.pessoas.map(p => ({ ...p })));
    setSelecionada(null);
    setMode('setup');
    notificar(`Configuração clonada para ${MESES[novoMes - 1]}/${novoAno}. Verifique e gere.`);
  }

  async function handleDelete() {
    if (!completaAtual) return;
    await excluirConfig(completaAtual.config.id);
    const c = await listarCompletas();
    setCompletas(c);
    if (c.length > 0) { setSelecionada(c[0].config.id); setMode('view'); }
    else { setSelecionada(null); setMode('setup'); }
  }

  function handleEdit() {
    if (!completaAtual) return;
    const { config: cfg } = completaAtual;
    setEquipe(cfg.equipe);
    setMes(cfg.mes);
    setAno(cfg.ano);
    setParidade(cfg.paridade);
    setPessoas(cfg.pessoas.map(p => ({ ...p })));
    setMode('setup');
  }

  function handleAutoFill() {
    if (bombeiros.length < 10) { notificar('Cadastre pelo menos 10 bombeiros.'); return; }

    const porFuncao = (cargo: string) => {
      if (cargo === 'BA-MC') return bombeiros.filter(b => validarCursoParaFuncao(b, 'BA-MC')?.nivel !== 'bloqueado');
      if (cargo === 'BA-CE') return bombeiros.filter(b => validarCursoParaFuncao(b, 'BA-CE')?.nivel !== 'bloqueado');
      if (cargo === 'BA-LR') return bombeiros.filter(b => validarCursoParaFuncao(b, 'BA-LR')?.nivel !== 'bloqueado');
      return bombeiros.filter(b =>
        validarCursoParaFuncao(b, 'BA-CE')?.nivel === 'bloqueado' &&
        validarCursoParaFuncao(b, 'BA-LR')?.nivel === 'bloqueado' &&
        validarCursoParaFuncao(b, 'BA-MC')?.nivel === 'bloqueado'
      );
    };

    const escolher = (arr: Bombeiro[], usado: Set<string>) => {
      const disp = arr.filter(b => !usado.has(b.id));
      return disp.length > 0 ? disp[Math.floor(Math.random() * disp.length)] : null;
    };

    const usado = new Set<string>();
    const novas = SLOTS.map(slot => {
      const pool = slot.funcao === 'chefe' ? porFuncao('BA-CE')
        : slot.funcao === 'lider' ? porFuncao('BA-LR')
        : slot.funcao === 'ba-mc' ? porFuncao('BA-MC')
        : porFuncao('BA-2');

      const b = escolher(pool, usado);
      if (!b) return null;
      usado.add(b.id);
      return {
        id: b.id, nome: b.nome, nomeGuerra: b.nomeGuerra,
        funcao: slot.funcao, veiculo: slot.veiculo,
        funcaoNoVeiculo: slot.funcaoNoVeiculo, isRadioFixo: slot.isRadioFixo,
      } as Partial<PessoaEscala>;
    });

    setPessoas(novas);
    notificar(`${novas.filter(Boolean).length}/10 pessoas preenchidas.`);
  }

  async function handleAutoFillComEfetivo() {
    try {
      const [gozos, escalasFerias] = await Promise.all([
        listarFeriasGozo(),
        listarEscalasFerias(equipe, ano),
      ]);

      const membrosEquipe = bombeiros.filter(b => b.equipe === equipe);

      const items: { funcionarioId: string; substitutoId?: string; substitutoNome?: string; feiristaId?: string; feiristaNome?: string }[] = [];
      for (const esc of escalasFerias) {
        const it = await listarItensEscala(esc.id);
        for (const i of it) {
          if (i.mes === mes) items.push(i);
        }
      }

      const emGozoIds = new Set(
        gozos
          .filter(g => {
            if (g.funcionarioId && (g.status === 'Em Gozo' || g.status === 'Programadas' || g.status === 'Gozadas')) {
              const gInicio = new Date(g.dataInicio + 'T00:00:00');
              const gFim = new Date(g.dataFim + 'T00:00:00');
              const mesInicio = new Date(ano, mes - 1, 1);
              const mesFim = new Date(ano, mes, 0);
              return gInicio <= mesFim && gFim >= mesInicio;
            }
            return false;
          })
          .map(g => g.funcionarioId)
      );

      const substitutosMap = new Map<string, { id: string; nome: string }>();
      const feiristasMap = new Map<string, { id: string; nome: string }>();
      for (const item of items) {
        if (item.substitutoId && item.substitutoNome && emGozoIds.has(item.funcionarioId)) {
          const b = bombeiros.find(bb => bb.id === item.substitutoId);
          if (b) substitutosMap.set(item.funcionarioId, { id: item.substitutoId, nome: item.substitutoNome });
        }
        if (item.feiristaId && item.feiristaNome && emGozoIds.has(item.funcionarioId)) {
          const b = bombeiros.find(bb => bb.id === item.feiristaId);
          if (b) feiristasMap.set(item.funcionarioId, { id: item.feiristaId, nome: item.feiristaNome });
        }
      }

      const disponiveis: Bombeiro[] = [];
      const jaIncluidos = new Set<string>();

      for (const m of membrosEquipe) {
        if (emGozoIds.has(m.id)) {
          const sub = substitutosMap.get(m.id);
          if (sub) {
            const b = bombeiros.find(bb => bb.id === sub.id);
            if (b && !jaIncluidos.has(b.id)) { disponiveis.push(b); jaIncluidos.add(b.id); }
          }
          const feir = feiristasMap.get(m.id);
          if (feir) {
            const b = bombeiros.find(bb => bb.id === feir.id);
            if (b && !jaIncluidos.has(b.id)) { disponiveis.push(b); jaIncluidos.add(b.id); }
          }
        } else {
          if (!jaIncluidos.has(m.id)) { disponiveis.push(m); jaIncluidos.add(m.id); }
        }
      }

      const poolPorFuncao = (funcao: string) => {
        if (funcao === 'BA-CE') return disponiveis.filter(b => validarCursoParaFuncao(b, 'BA-CE')?.nivel !== 'bloqueado');
        if (funcao === 'BA-LR') return disponiveis.filter(b => validarCursoParaFuncao(b, 'BA-LR')?.nivel !== 'bloqueado');
        if (funcao === 'BA-MC') return disponiveis.filter(b => validarCursoParaFuncao(b, 'BA-MC')?.nivel !== 'bloqueado');
        return disponiveis.filter(b => validarCursoParaFuncao(b, 'BA-CE')?.nivel === 'bloqueado' && validarCursoParaFuncao(b, 'BA-LR')?.nivel === 'bloqueado' && validarCursoParaFuncao(b, 'BA-MC')?.nivel === 'bloqueado');
      };

      const escolher = (arr: Bombeiro[], usado: Set<string>) => {
        const disp = arr.filter(b => !usado.has(b.id));
        return disp.length > 0 ? disp[0] : null;
      };

      const usado = new Set<string>();
      const novas = SLOTS.map(slot => {
        const pool = slot.funcao === 'chefe' ? poolPorFuncao('BA-CE')
          : slot.funcao === 'lider' ? poolPorFuncao('BA-LR')
          : slot.funcao === 'ba-mc' ? poolPorFuncao('BA-MC')
          : poolPorFuncao('BA-2');

        const b = escolher(pool, usado);
        if (!b) return null;
        usado.add(b.id);
        return {
          id: b.id, nome: b.nome, nomeGuerra: b.nomeGuerra,
          funcao: slot.funcao, veiculo: slot.veiculo,
          funcaoNoVeiculo: slot.funcaoNoVeiculo, isRadioFixo: slot.isRadioFixo,
        } as Partial<PessoaEscala>;
      });

      setPessoas(novas);
      const ausentes = membrosEquipe.filter(m => emGozoIds.has(m.id));
      if (ausentes.length > 0) {
        notificar(`${novas.filter(Boolean).length}/10 preenchidas. ${ausentes.length} ausente(s) em gozo.`);
      } else {
        notificar(`${novas.filter(Boolean).length}/10 pessoas preenchidas com o efetivo do mês.`);
      }
    } catch {
      notificar('Erro ao carregar dados de férias.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {mode === 'list' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Escala Mensal</h2>
          <button onClick={() => {
            setEquipe(''); setMes(new Date().getMonth() + 1); setAno(new Date().getFullYear());
            setParidade('impar'); setPessoas(SLOTS.map(() => null)); setMode('setup');
          }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20">
            <Calendar className="h-4 w-4" /> Nova Escala Mensal
          </button>
        </div>
      )}
      {mode !== 'list' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => { setMode('list'); setSelecionada(null); }}
              className="rounded-xl border border-graphite-300/60 bg-white/80 px-3 py-1.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
              Voltar
            </button>
            <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Escala Mensal</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === 'view' && completaAtual && (
              <>
                <button onClick={handleEdit}
                  className="flex items-center gap-1 rounded-xl border border-graphite-300/60 bg-white/80 px-3 py-1.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                  Editar
                </button>
                <button onClick={handleClone}
                  className="flex items-center gap-1 rounded-xl border border-aviation-300 bg-aviation-50 px-3 py-1.5 text-sm font-medium text-aviation-700 dark:border-aviation-700 dark:bg-aviation-900/20 dark:text-aviation-300">
                  <Copy className="h-4 w-4" /> Clonar p/ Próximo Mês
                </button>
                <button onClick={handleExportPNG}
                  className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <Image className="h-4 w-4" /> Salvar PNG
                </button>
                <button onClick={() => {
                  if (completaAtual) {
                    document.title = `ESCALA MENSAL EQUIPE ${completaAtual.config.equipe} MÊS DE ${MESES[completaAtual.config.mes - 1]} ${completaAtual.config.ano}`;
                  }
                  window.print();
                }}
                  className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20">
                  <Printer className="h-4 w-4" /> Imprimir
                </button>
                {(effectiveRole === 'desenvolvedor' || effectiveRole === 'admin') && (
                  <button onClick={handleDelete}
                    className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    <Trash2 className="h-4 w-4" /> Excluir
                  </button>
                )}
              </>
            )}
            {mode === 'setup' && completas.length > 0 && (
              <button onClick={() => { setMode('list'); setSelecionada(null); }}
                className="rounded-xl border border-graphite-300/60 bg-white/80 px-3 py-1.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Setup mode */}
      {mode === 'setup' && (
    <div className="space-y-6 pb-60">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Equipe <span className="text-red-500">*</span></label>
              <select value={equipe} onChange={e => setEquipe(e.target.value)} disabled={!isGlobal}
                className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 disabled:opacity-60">
                <option value="">Selecionar equipe</option>
                {equipesDisponiveis.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Mês</label>
              <select value={mes} onChange={e => setMes(Number(e.target.value))}
                className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Ano</label>
              <select value={ano} onChange={e => setAno(Number(e.target.value))}
                className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
                {[2024, 2025, 2026, 2027, 2028].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Plantões em dias</label>
              <select value={paridade} onChange={e => setParidade(e.target.value as 'par' | 'impar')}
                className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
                <option value="impar">Ímpares (1, 3, 5...)</option>
                <option value="par">Pares (2, 4, 6...)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { nome: 'CRS', cor: 'border-blue-300 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/10', indices: [2, 1, 5, 6] },
              { nome: 'CCI F2', cor: 'border-amber-300 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-900/10', indices: [3, 0, 7] },
              { nome: 'CCI F3', cor: 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-900/10', indices: [4, 8, 9] },
            ].map(veiculo => (
              <div key={veiculo.nome} className={`rounded-2xl border-2 ${veiculo.cor} p-4`}>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-graphite-700 dark:text-graphite-300">
                  {veiculo.nome}
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {veiculo.indices.map(idx => {
                    const slot = SLOTS[idx];
                    const p = pessoas[idx];
                    const b = p?.nomeGuerra ? bombeiros.find(bb => bb.nomeGuerra === p!.nomeGuerra) : null;
                    const cargoReq = slot.funcao === 'chefe' ? 'BA-CE' as const : slot.funcao === 'lider' ? 'BA-LR' as const : slot.funcao === 'ba-mc' ? 'BA-MC' as const : undefined;
                    const aviso = b && cargoReq ? validarCursoParaFuncao(b, cargoReq) : null;
                    return (
                      <div key={idx} className="rounded-xl border border-graphite-200/60 bg-white/70 p-3 dark:border-border-dark dark:bg-surface-card/70">
                        <p className="mb-1.5 text-xs font-medium text-graphite-500 dark:text-graphite-400">{slot.label} <span className="text-red-500">*</span></p>
                        <SearchSelect value={p?.nomeGuerra || ''} equipe={equipe} cargo={slot.cargoFiltro} showCargo onChange={v => {
                          const found = bombeiros.find(bb => bb.nomeGuerra === v);
                          const next = [...pessoas];
                          next[idx] = found ? { id: found.id, nome: found.nome, nomeGuerra: found.nomeGuerra, funcao: slot.funcao, veiculo: slot.veiculo, funcaoNoVeiculo: slot.funcaoNoVeiculo, isRadioFixo: slot.isRadioFixo } : null;
                          setPessoas(next);
                        }} placeholder="Selecione..." />
                        {aviso && (
                          <div className={`mt-1.5 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[10px] leading-tight ${aviso.nivel === 'bloqueado' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{aviso.mensagem}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleAutoFill}
              className="flex items-center gap-2 rounded-xl border border-aviation-300 bg-aviation-50 px-4 py-2.5 text-sm font-medium text-aviation-700 transition-all hover:bg-aviation-100 dark:border-aviation-700 dark:bg-aviation-900/20 dark:text-aviation-300">
              <Sparkles className="h-4 w-4" /> Auto-Preenchimento
            </button>
            <button onClick={handleAutoFillComEfetivo}
              className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <Users className="h-4 w-4" /> Preencher com Efetivo do Mês
            </button>
            <button onClick={handleGerar}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
              <Save className="h-4 w-4" /> Gerar Escala Mensal
            </button>
            <p className="text-xs text-graphite-400">{qtdPessoas}/10 pessoas</p>
          </div>
        </div>
      )}

      {/* View mode */}
      {mode === 'view' && completaAtual && (
        <div id="print-area" className="space-y-0.5" style={{ background: '#ffffff', color: '#1a1a1a', overflow: 'hidden', textTransform: 'uppercase' }}>
          <style>{'@media print {@page {size: landscape; margin: 0.5cm} #print-area {text-transform: uppercase !important} .print-hide {display: none}}'}</style>
          <div className="rounded border-2 border-graphite-300 bg-white/80 px-3 py-1 text-center uppercase dark:border-border-dark dark:bg-surface-card">
            <div className="text-[13px] font-bold text-graphite-700 dark:text-graphite-300 space-x-6 uppercase">
              <span>EQUIPE: {completaAtual.config.equipe.toUpperCase()}</span>
              <span>{MESES[completaAtual.config.mes - 1].toUpperCase()} {completaAtual.config.ano}</span>
              <span>{completaAtual.paradas.length} DIAS</span>
            </div>
          </div>

          {veiculosView}

          {/* Rádio */}
          <div className="rounded border-2 border-graphite-300 bg-white/80 p-1 dark:border-border-dark dark:bg-surface-card print:overflow-visible">
            <div className="flex items-center gap-0.5 mb-px">
              <Radio className="h-3 w-3 text-aviation-600" />
              <span className="text-[12px] font-bold text-graphite-800 dark:text-graphite-200">Rádio</span>
            </div>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-[10px] leading-snug print:text-[9px]">
                <thead>
                  <tr className="border-b-2 border-graphite-300 dark:border-border-dark">
                    <th className="bg-white px-0.5 py-0 text-left font-bold text-graphite-600 print:text-graphite-800 dark:bg-surface-card">#</th>
                    <th className="bg-white px-0.5 py-0 text-left font-bold text-graphite-600 print:text-graphite-800 dark:bg-surface-card">Data</th>
                    {SLOTS_RADIO.map((s, i) => (
                      <th key={i} className="px-0.5 py-0 text-left font-bold text-graphite-600 print:text-graphite-800">
                        {s.horario}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completaAtual.paradas.map(p => (
                    <tr key={p.dia} className="border-b border-graphite-200 print:border-graphite-300 dark:border-border-dark">
                      <td className="bg-white px-0.5 py-0 font-semibold print:font-bold text-graphite-600 print:text-graphite-800 dark:bg-surface-card whitespace-nowrap">{p.dia}</td>
                      <td className="bg-white px-0.5 py-0 text-graphite-500 print:font-bold print:text-graphite-700 dark:bg-surface-card whitespace-nowrap">{new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      {p.radio.map((r, i) => (
                        <td key={i} className="px-0.5 py-0 font-semibold print:font-bold text-graphite-800 print:text-graphite-900 dark:text-graphite-200 whitespace-nowrap">{r.pessoaNomeGuerra}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Faxina */}
          <div className="rounded border-2 border-graphite-400 bg-white p-1 dark:border-border-dark dark:bg-surface-card">
            <div className="flex items-center gap-0.5 mb-px">
              <ClipboardList className="h-3 w-3 text-aviation-600" />
              <span className="text-[12px] font-bold text-graphite-900 dark:text-graphite-200">Faxina</span>
            </div>
            <div className="grid grid-cols-5 gap-px text-[10px]">
              {completaAtual.faxinaMensal.map((f, i) => (
                <div key={i} className={`rounded border-2 px-1.5 py-0.5 font-semibold ${
                  f.local === 'Sala e WC Liderança' ? 'border-amber-500 bg-amber-50' :
                  f.local === 'Lixo' ? 'border-red-500 bg-red-50' :
                  'border-graphite-400 bg-graphite-100'
                }`}>
                  <p className="text-graphite-700 font-semibold">{f.local}</p>
                  <p className="font-bold text-graphite-900">{f.pessoaNomeGuerra}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Responsabilidades */}
          <div className="rounded border-2 border-graphite-400 bg-white p-1 dark:border-border-dark dark:bg-surface-card">
            <div className="flex items-center gap-0.5 mb-px">
              <Users className="h-3 w-3 text-aviation-600" />
              <span className="text-[12px] font-bold text-graphite-900 dark:text-graphite-200">Responsabilidades</span>
            </div>
            <div className="grid grid-cols-2 gap-x-1 gap-y-px text-[10px]">
              {completaAtual.responsabilidades.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded border-2 border-graphite-400 bg-graphite-100 px-1.5 py-0.5 font-semibold">
                  <span className="text-graphite-800 truncate">{r.descricao}</span>
                  <span className="ml-1 font-bold text-graphite-900 shrink-0">{r.pessoaNomeGuerra}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Avisos */}
          <div className="space-y-px">
            <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-bold leading-tight">
              <div className="rounded border-2 border-amber-600 bg-amber-100 px-2 py-1 text-amber-900 text-center">
                EXECUTAR A HIGIENIZAÇÃO DAS ÁREAS, APÓS AS 06:00 HORAS
              </div>
              <div className="rounded border-2 border-sky-600 bg-sky-100 px-2 py-1 text-sky-900 text-center">
                CCI's podem ser higienizados internamente antes das 06 mas devem ser higienizados por dentro e por fora todos os turnos, e nos para-lamas deve ser passo pano após a varredura da garagem para não ficar pó sobre os mesmos
              </div>
              <div className="rounded border-2 border-emerald-600 bg-emerald-100 px-2 py-1 text-emerald-900 text-center">
                HIGIENIZAÇÃO CONFORME POP 006
              </div>
            </div>
            <div className="rounded border-2 border-red-700 bg-red-100 px-2 py-1 text-[7px] font-bold leading-snug text-red-900 text-center whitespace-nowrap">
              ATENÇÃO: AS HIGIENIZAÇÕES DEVER SER EXECUTADAS POR TODOS, CASO ESTEJAM PEGANDO SUJO COBREM DO TURNO ANTERIOR ASSIM COMO ESTÁ PREVISTO NO POP, POIS IREMOS COBRAR DA NOSSA EQUIPE, SEM EXCEÇÕES
            </div>
          </div>
        </div>
      )}

      {/* List mode */}
      {mode === 'list' && (
        <>
          {isGlobal && (
            <div className="flex items-center gap-2">
              <select value={filterListEquipe} onChange={e => setFilterListEquipe(e.target.value)}
                className="rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2 text-sm dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
                <option value="">Todas as equipes</option>
                {['Alfa','Bravo','Charlie','Delta'].map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
              <span className="text-xs text-graphite-400">{completasFiltradas.length} escala(s)</span>
            </div>
          )}
          {completasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
              <Calendar className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
              <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhuma escala mensal</h3>
              <p className="text-sm text-graphite-500 dark:text-graphite-400">Clique em "Nova Escala Mensal" para criar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completasFiltradas.map(c => (
                <div key={c.config.id}
                  onClick={() => { setSelecionada(c.config.id); setMode('view'); }}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-graphite-200/60 bg-white/80 p-4 backdrop-blur-sm transition-all hover:bg-aviation-50/50 dark:border-border-dark dark:bg-surface-card dark:hover:bg-aviation-900/20"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-aviation-600 dark:text-aviation-400" />
                    <div>
                      <p className="text-sm font-semibold text-graphite-900 dark:text-graphite-100">{MESES[c.config.mes - 1]} {c.config.ano} · Equipe {c.config.equipe}</p>
                      <p className="text-xs text-graphite-500 dark:text-graphite-400">
                        {c.paradas.length} plantões · {c.config.paridade === 'impar' ? 'Ímpares' : 'Pares'}
                      </p>
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-graphite-400" />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state (view mode, no data) */}
      {mode === 'view' && !completaAtual && completas.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <Calendar className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhuma escala mensal</h3>
          <p className="text-sm text-graphite-500">Clique em "Nova Escala" para configurar.</p>
        </div>
      )}

      {msg && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-graphite-900 px-5 py-3 text-sm font-medium text-white shadow-xl dark:bg-graphite-100 dark:text-graphite-900">
          {msg}
        </div>
      )}
    </div>
  );
}

export default EscalaMensal;
