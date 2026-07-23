import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar, Shield, Users, Plus, Trash2, FileText, Radio,
  ChevronDown, ChevronUp, Save, Eye, Pencil, Copy, Printer,
  AlertTriangle,
  ArrowRightLeft, ArrowRight, Sparkles,
} from 'lucide-react';
import { SearchSelect, type AtivoItem } from '../../components/ui/SearchSelect';
import { useAuth } from '../../context/AuthContext';
import { listarEscalas, criarEscala, atualizarEscala, excluirEscala } from '../../services/escalaService';
import { listarAtivos } from '../../services/bombeiroService';
import { equipesNoDia, horarioPlantaoPorEquipe } from '../../utils/equipes';
import { listarSubstituicoesTemporarias } from '../../services/substituicaoTemporariaService';
import { listarVigencias } from '../../services/vigenciaSubstituicaoService';
import type { VigenciaSubstituicao } from '../../services/vigenciaSubstituicaoService';
import { listarFeriasGozo, listarEscalas as listarEscalasFerias, listarItensEscala } from '../../services/feriasService';
import { listarCompletas } from '../../services/escalaMensalService';
import { gerarRadioPlantao } from '../../services/escalaMensalGenerator';
import { FUNCOES_BDS_PTR } from '../../types/escala';
import type { EscalaDiaria } from '../../types/escala';
import type { Bombeiro, Cargo } from '../../types/bombeiro';
import type { FeriasGozo } from '../../types/ferias';
import type { SubstituicaoTemporaria } from '../../types/substituicaoTemporaria';
import { validarCursoParaFuncao } from '../../utils/validacaoCursos';

const EQUIPES = ['Alfa', 'Bravo', 'Charlie', 'Delta'] as const;

const optionCls = 'dark:bg-graphite-700 dark:text-graphite-100';
const inputClass = 'rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated';
const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ANOS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

function emptyGuarnicoes() {
  return {
    cci02: { baMc: '', baCe: '', ba2: '' },
    cci03: { baMc: '', ba2_1: '', ba2_2: '' },
    crs: { baMc: '', baLr: '', baRe1: '', baRe2: '' },
  };
}

function emptyEscala(): Omit<EscalaDiaria, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  const horario = horarioPlantaoPorEquipe('Alfa');
  return {
    equipe: 'Alfa',
    chefeEquipe: '',
    dataPlantao: new Date().toISOString().split('T')[0],
    horarioInicio: horario.horarioInicio,
    horarioTermino: horario.horarioTermino,
    turno: horario.turno,
    guarnicoes: emptyGuarnicoes(),
    bds: { funcao: '', nomeGuerra: '' },
    ptr1: { funcao: '', nomeGuerra: '' },
    ptr2: { funcao: '', nomeGuerra: '' },
    atestados: [],
    trocas: [],
    radio: [],
  };
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function autoPreencher(equipe: string) {
  return horarioPlantaoPorEquipe(equipe);
}

interface EfetivoDiarioEntry {
  bombeiro: Bombeiro;
  cargoExercido: string;
  substituindo?: {
    id: string;
    nome: string;
    cargo: string;
  };
}

function dataLocal(data: string): Date {
  return new Date(`${data}T12:00:00`);
}

function dataNoPeriodo(data: string, dataInicio: string, dataFim: string): boolean {
  if (!data || !dataInicio || !dataFim) return false;
  const dia = dataLocal(data);
  return dataLocal(dataInicio) <= dia && dataLocal(dataFim) >= dia;
}

function montarEfetivoDiario(params: {
  bombeiros: Bombeiro[];
  feriasGozo: FeriasGozo[];
  vigencias: VigenciaSubstituicao[];
  equipe: string;
  dataPlantao: string;
}): EfetivoDiarioEntry[] {
  const { bombeiros, feriasGozo, vigencias, equipe, dataPlantao } = params;
  if (!equipe || !dataPlantao) return [];

  const ativos = bombeiros.filter(b => !b.dataDesligamento);
  const porId = new Map(ativos.map(b => [b.id, b]));
  const equipeDaVaga = (v: VigenciaSubstituicao): string => {
    const original = porId.get(v.funcionarioOriginalId);
    return original?.equipe || v.equipe;
  };

  const vigenciasNoDia = vigencias.filter(v =>
    v.ativa &&
    v.substitutoId &&
    dataNoPeriodo(dataPlantao, v.dataInicio, v.dataFim) &&
    equipeDaVaga(v) === equipe
  );
  const vigenciasReais = vigenciasNoDia.filter(v => v.substitutoId !== v.funcionarioOriginalId);
  const vigenciasAuto = vigenciasNoDia.filter(v => v.substitutoId === v.funcionarioOriginalId);
  const realPorOriginal = new Map<string, VigenciaSubstituicao>();
  const realPorSubstituto = new Map<string, VigenciaSubstituicao>();
  for (const v of vigenciasReais) {
    realPorOriginal.set(v.funcionarioOriginalId, v);
    realPorSubstituto.set(v.substitutoId, v);
  }

  const gozosNoDia = feriasGozo.filter(g =>
    g.status !== 'Gozadas' &&
    dataNoPeriodo(dataPlantao, g.dataInicio, g.dataFim)
  );
  const emGozo = new Set(gozosNoDia.map(g => g.funcionarioId));
  const vagasAbertas = new Set(vigenciasAuto.map(v => v.funcionarioOriginalId));

  const fallbackPorOriginal = new Map<string, { substituto: Bombeiro; cargo: string; original: Bombeiro }>();
  const fallbackPorSubstituto = new Map<string, { substituto: Bombeiro; cargo: string; original: Bombeiro }>();
  for (const gozo of gozosNoDia) {
    if (realPorOriginal.has(gozo.funcionarioId)) continue;
    const original = porId.get(gozo.funcionarioId);
    const substituto = gozo.substitutoId ? porId.get(gozo.substitutoId) : undefined;
    if (!original || !substituto) continue;
    if ((original.equipe || gozo.equipe) !== equipe) continue;
    const fallback = {
      substituto,
      cargo: gozo.funcaoSubstituicao || original.cargo,
      original,
    };
    fallbackPorOriginal.set(original.id, fallback);
    fallbackPorSubstituto.set(substituto.id, fallback);
  }

  const resultado: EfetivoDiarioEntry[] = [];
  const adicionados = new Set<string>();
  const adicionar = (bombeiro: Bombeiro, cargoExercido: string, substituindo?: EfetivoDiarioEntry['substituindo']) => {
    if (adicionados.has(bombeiro.id)) return;
    resultado.push({ bombeiro, cargoExercido, substituindo });
    adicionados.add(bombeiro.id);
  };

  for (const membro of ativos.filter(b => b.equipe === equipe)) {
    const substitui = realPorSubstituto.get(membro.id);
    const fallbackSubstitui = fallbackPorSubstituto.get(membro.id);
    if (substitui) {
      adicionar(membro, substitui.cargoExercido || membro.cargo, {
        id: substitui.funcionarioOriginalId,
        nome: substitui.funcionarioOriginalNome,
        cargo: substitui.cargoOriginalFuncionario,
      });
      continue;
    }
    if (fallbackSubstitui) {
      adicionar(membro, fallbackSubstitui.cargo, {
        id: fallbackSubstitui.original.id,
        nome: fallbackSubstitui.original.nomeCompleto,
        cargo: fallbackSubstitui.original.cargo,
      });
      continue;
    }
    if (emGozo.has(membro.id) || realPorOriginal.has(membro.id) || fallbackPorOriginal.has(membro.id) || vagasAbertas.has(membro.id)) {
      continue;
    }
    adicionar(membro, membro.cargo);
  }

  for (const v of vigenciasReais) {
    const substituto = porId.get(v.substitutoId);
    if (!substituto) continue;
    adicionar(substituto, v.cargoExercido || substituto.cargo, {
      id: v.funcionarioOriginalId,
      nome: v.funcionarioOriginalNome,
      cargo: v.cargoOriginalFuncionario,
    });
  }

  for (const fallback of fallbackPorSubstituto.values()) {
    adicionar(fallback.substituto, fallback.cargo, {
      id: fallback.original.id,
      nome: fallback.original.nomeCompleto,
      cargo: fallback.original.cargo,
    });
  }

  const ordemCargo = ['GS', 'BA-CE', 'BA-LR', 'BA-MC', 'BA-2', 'BA-RE', 'OC'];
  return resultado.sort((a, b) => {
    const cargoA = ordemCargo.indexOf(a.cargoExercido);
    const cargoB = ordemCargo.indexOf(b.cargoExercido);
    if (cargoA !== cargoB) return cargoA - cargoB;
    return a.bombeiro.nomeGuerra.localeCompare(b.bombeiro.nomeGuerra);
  });
}

function montarOpcoesEfetivoDiario(efetivo: EfetivoDiarioEntry[], equipe: string): AtivoItem[] {
  return efetivo.map(entry => ({
    id: entry.bombeiro.id,
    nomeGuerra: entry.bombeiro.nomeGuerra,
    nomeCompleto: entry.bombeiro.equipe === equipe
      ? entry.bombeiro.nomeCompleto
      : `${entry.bombeiro.nomeCompleto} (${entry.bombeiro.equipe})`,
    cargo: entry.cargoExercido,
    equipe,
  }));
}

const SLOT_ROLE_MAP: Record<string, Cargo> = {
  'BA-CE': 'BA-CE',
  'BA-LR': 'BA-LR',
  'BA-MC': 'BA-MC',
};

function SlotFuncao({
  label,
  value,
  onChange,
  allBombeiros,
  veiculo,
  options,
  cargoFiltro,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allBombeiros: Bombeiro[];
  veiculo?: 'crs' | 'cci';
  options: AtivoItem[];
  cargoFiltro?: string;
}) {
  const role = SLOT_ROLE_MAP[label];
  const selecionado = value ? allBombeiros.find(b => b.nomeGuerra === value) : null;
  const aviso = selecionado && role ? validarCursoParaFuncao(selecionado, role, veiculo) : null;

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-graphite-500 dark:text-graphite-400">{label}</p>
      <SearchSelect value={value} onChange={onChange} placeholder={`Selecione ${label}`} options={options} cargo={cargoFiltro} showCargo showEquipe />
      {aviso && (
        <div className={`mt-1.5 flex items-start gap-2 rounded-lg px-2.5 py-2 text-[11px] leading-tight ${
          aviso.nivel === 'bloqueado'
            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
        }`}>
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{aviso.mensagem}</span>
        </div>
      )}
    </div>
  );
}

// ─── FORM ────────────────────────────────────────────────
function EscalaDiariaForm({
  escala,
  onSave,
  onCancel,
}: {
  escala?: EscalaDiaria;
  onSave: (data: Omit<EscalaDiaria, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(emptyEscala());
  const [allBombeiros, setAllBombeiros] = useState<Bombeiro[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [vigencias, setVigencias] = useState<VigenciaSubstituicao[]>([]);
  const [substituicoes, setSubstituicoes] = useState<SubstituicaoTemporaria[]>([]);
  const [autoFilling, setAutoFilling] = useState(false);

  useEffect(() => {
    Promise.all([
      listarAtivos(),
      listarFeriasGozo(),
      listarVigencias({ ativa: true }),
    ]).then(([ativos, gozos, vigs]) => {
      setAllBombeiros(ativos);
      setFeriasGozo(gozos);
      setVigencias(vigs);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    listarSubstituicoesTemporarias().then(lista => {
      setSubstituicoes(lista.filter(s => s.status === 'Aprovada'));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.dataPlantao) return;
    const data = form.dataPlantao;
    const aprovadas = substituicoes.filter(s =>
      s.status === 'Aprovada' && data >= s.dataInicio && data <= s.dataFim
    );

    const trocasTemp = aprovadas.map(s => ({
      funcaoSaindo: s.funcionarioCargo || '',
      nomeSaindo: s.funcionarioNome,
      funcaoEntrando: s.substitutoCargo || '',
      nomeEntrando: s.substitutoNome,
    }));

    if (trocasTemp.length === 0) return;

    setForm(f => {
      const combinadas = [...f.trocas, ...trocasTemp.filter(n =>
        !f.trocas.some(t => t.nomeSaindo === n.nomeSaindo && t.nomeEntrando === n.nomeEntrando)
      )];
      return { ...f, trocas: combinadas };
    });
  }, [form.dataPlantao, substituicoes]);

  useEffect(() => {
    if (escala) {
      setForm({
        equipe: escala.equipe,
        chefeEquipe: escala.chefeEquipe,
        dataPlantao: escala.dataPlantao,
        horarioInicio: escala.horarioInicio,
        horarioTermino: escala.horarioTermino,
        turno: escala.turno,
        guarnicoes: escala.guarnicoes,
        bds: escala.bds,
        ptr1: escala.ptr1,
        ptr2: escala.ptr2,
        atestados: escala.atestados,
        trocas: escala.trocas,
        radio: escala.radio,
      });
    }
  }, [escala]);

  // Auto-selecionar equipa com base na data se nenhuma equipa foi escolhida
  useEffect(() => {
    if (!form.dataPlantao) return;
    const data = new Date(form.dataPlantao + 'T12:00:00');
    const equipes = equipesNoDia(data);
    if (!equipes.some(eq => eq === form.equipe)) {
      setForm(f => ({ ...f, equipe: equipes[0] }));
    }
  }, [form.dataPlantao]);

  const autoFilledRef = useRef(false);
  useEffect(() => {
    if (form.equipe && form.dataPlantao && !escala && allBombeiros.length > 0 && !autoFilledRef.current) {
      autoPreencherGuarnicoes();
      autoFilledRef.current = true;
    }
  }, [form.equipe, form.dataPlantao, allBombeiros]);

  const efetivoDiario = useMemo(() => montarEfetivoDiario({
    bombeiros: allBombeiros,
    feriasGozo,
    vigencias,
    equipe: form.equipe,
    dataPlantao: form.dataPlantao,
  }), [allBombeiros, feriasGozo, vigencias, form.equipe, form.dataPlantao]);

  const efetivoOptions = useMemo(
    () => montarOpcoesEfetivoDiario(efetivoDiario, form.equipe),
    [efetivoDiario, form.equipe],
  );

  const opcoesPorCargo = (cargos: string[]) => efetivoOptions.filter(o => o.cargo && cargos.includes(o.cargo));
  const opcoesChefe = opcoesPorCargo(['BA-CE']);
  const opcoesBaMc = opcoesPorCargo(['BA-MC']);
  const opcoesBaLr = opcoesPorCargo(['BA-LR']);
  const opcoesBa2 = opcoesPorCargo(['BA-2']);
  const opcoesBaRe = opcoesPorCargo(['BA-2', 'BA-RE']);

  function updateEquipe(equipe: string) {
    const auto = autoPreencher(equipe);
    const membros = montarEfetivoDiario({
      bombeiros: allBombeiros,
      feriasGozo,
      vigencias,
      equipe,
      dataPlantao: form.dataPlantao,
    }).map(entry => ({ nomeGuerra: entry.bombeiro.nomeGuerra, cargo: entry.cargoExercido }));
    const find = (cargo: Cargo) => {
      const idx = membros.findIndex(b => b.cargo === cargo);
      if (idx !== -1) return membros.splice(idx, 1)[0].nomeGuerra;
      return '';
    };
    const findAny = (cargos: Cargo[]) => {
      for (const c of cargos) {
        const idx = membros.findIndex(b => b.cargo === c);
        if (idx !== -1) return membros.splice(idx, 1)[0].nomeGuerra;
      }
      return '';
    };
    const chefe = find('BA-CE');
    const mc1 = find('BA-MC'), mc2 = find('BA-MC'), mc3 = find('BA-MC');
    const lr = find('BA-LR');
    const b2_1 = findAny(['BA-2','BA-RE']), b2_2 = findAny(['BA-2','BA-RE']), b2_3 = findAny(['BA-2','BA-RE']), b2_4 = findAny(['BA-2','BA-RE']), b2_5 = findAny(['BA-2','BA-RE']);
    setForm(f => ({
      ...f,
      equipe,
      ...auto,
      chefeEquipe: chefe,
      guarnicoes: {
        crs: { baMc: mc1, baLr: lr, baRe1: b2_1, baRe2: b2_2 },
        cci02: { baMc: mc2, baCe: chefe, ba2: b2_3 },
        cci03: { baMc: mc3, ba2_1: b2_4, ba2_2: b2_5 },
      },
      bds: { funcao: '', nomeGuerra: '' },
      ptr1: { funcao: '', nomeGuerra: '' },
      ptr2: { funcao: '', nomeGuerra: '' },
      radio: [],
    }));
  }

  async function autoPreencherGuarnicoes() {
    if (!form.equipe || !form.dataPlantao || autoFilling) return;
    setAutoFilling(true);
    try {
      const [all, gozos, escalas, vigs, completas] = await Promise.all([
        listarAtivos(),
        listarFeriasGozo(),
        listarEscalasFerias(),
        listarVigencias({ ativa: true }),
        listarCompletas(),
      ]);

      setAllBombeiros(all);
      setFeriasGozo(gozos);
      setVigencias(vigs);

      const allItems: any[] = [];
      for (const esc of escalas) {
        if (esc.status !== 'Aprovado') continue;
        const its = await listarItensEscala(esc.id);
        for (const i of its) {
          if (!i.rejeitado && i.feriasGozoId) allItems.push(i);
        }
      }

      const dateObj = new Date(form.dataPlantao + 'T00:00:00');

      function isEmGozo(bId: string) {
        return gozos.find((g: any) => {
          if (g.funcionarioId !== bId || g.status === 'Gozadas') return false;
          const gInicio = new Date(g.dataInicio + 'T00:00:00');
          const gFim = new Date(g.dataFim + 'T00:00:00');
          return gInicio <= dateObj && gFim >= dateObj;
        });
      }

      // Encontrar substituto de uma pessoa (vigência → gozo → item)
      function encontrarSubstituto(bId: string): { id: string; nome: string } | null {
        const v = vigs.find((vx: any) =>
          vx.funcionarioOriginalId === bId &&
          vx.ativa &&
          dataNoPeriodo(form.dataPlantao, vx.dataInicio, vx.dataFim)
        );
        if (v && v.substitutoId) return { id: v.substitutoId, nome: v.substitutoNome };
        const g = gozos.find((gx: any) =>
          gx.funcionarioId === bId &&
          gx.substitutoId &&
          gx.status !== 'Gozadas' &&
          dataNoPeriodo(form.dataPlantao, gx.dataInicio, gx.dataFim)
        );
        if (g) return { id: g.substitutoId, nome: g.substitutoNome };
        const item = allItems.find((ix: any) =>
          ix.funcionarioId === bId &&
          (ix.substitutoId || ix.feristaId) &&
          dataNoPeriodo(form.dataPlantao, ix.dataInicio, ix.dataFim)
        );
        if (item) return { id: item.substitutoId || item.feristaId, nome: item.substitutoNome || item.feristaNome };
        return null;
      }

      // ── 1. Tentar usar a escala mensal como base ──
      const mensal = completas.find((c: any) =>
        c.config.equipe === form.equipe &&
        c.config.mes === (dateObj.getMonth() + 1) &&
        c.config.ano === dateObj.getFullYear()
      );

      let slotChefe = '';
      let slotCrsBaMc = '', slotCrsBaLr = '', slotCrsBaRe1 = '', slotCrsBaRe2 = '';
      let slotCci02BaMc = '', slotCci02BaCe = '', slotCci02Ba2 = '';
      let slotCci03BaMc = '', slotCci03Ba2_1 = '', slotCci03Ba2_2 = '';
      const usados = new Set<string>();

      if (mensal) {
        const pessoas = mensal.config.pessoas;
        const mapeamento: [number, (v: string) => void][] = [
          [0, v => { slotChefe = v; slotCci02BaCe = v; }],  // Chefe BA-CE
          [1, v => slotCrsBaLr = v],  // Líder BA-LR
          [2, v => slotCrsBaMc = v],  // Condutor BA-MC CRS
          [3, v => slotCci02BaMc = v], // Condutor BA-MC CCI F2
          [4, v => slotCci03BaMc = v], // Condutor BA-MC CCI F3
          [5, v => slotCrsBaRe1 = v],  // BA-2 CRS 1
          [6, v => slotCrsBaRe2 = v],  // BA-2 CRS 2
          [7, v => slotCci02Ba2 = v],  // BA-2 CCI F2
          [8, v => slotCci03Ba2_1 = v], // BA-2 CCI F3 1
          [9, v => slotCci03Ba2_2 = v], // BA-2 CCI F3 2
        ];
        for (const [idx, setter] of mapeamento) {
          const p = pessoas[idx];
          if (!p || !p.nomeGuerra) continue;
          // Verificar se está de férias nesta data
          const b = all.find((bb: any) => bb.nomeGuerra === p.nomeGuerra);
          if (b && isEmGozo(b.id)) {
            const subInfo = encontrarSubstituto(b.id);
            if (subInfo) {
              const sub = all.find((bb: any) => bb.id === subInfo.id);
              if (sub && !usados.has(sub.id)) {
                setter(sub.nomeGuerra);
                usados.add(sub.id);
                continue;
              }
            }
          }
          // Não está de férias ou sem substituto → mantém o original
          if (b && !usados.has(b.id)) {
            setter(p.nomeGuerra);
            usados.add(b.id);
          }
        }
      }

      // ── 2. Pool para preencher slots que ficaram vazios ──
      const pool: { bombeiro: any; cargo: string }[] = [];
      const ocupados = new Set<string>();
      for (const m of all.filter((b: any) => b.equipe === form.equipe)) {
        if (usados.has(m.id)) continue;
        if (!isEmGozo(m.id)) {
          pool.push({ bombeiro: m, cargo: m.cargo });
          continue;
        }
        const subInfo = encontrarSubstituto(m.id);
        if (subInfo) {
          const sub = all.find((bb: any) => bb.id === subInfo.id);
          if (sub && !ocupados.has(sub.id) && !usados.has(sub.id)) {
            pool.push({ bombeiro: sub, cargo: m.cargo });
            ocupados.add(sub.id);
          }
        }
      }
      for (const v of vigs) {
        if (v.ativa && v.equipe === form.equipe && dataNoPeriodo(form.dataPlantao, v.dataInicio, v.dataFim) && !ocupados.has(v.substitutoId) && !usados.has(v.substitutoId)) {
          const sub = all.find((bb: any) => bb.id === v.substitutoId);
          if (sub) { pool.push({ bombeiro: sub, cargo: v.cargoExercido || sub.cargo }); ocupados.add(sub.id); }
        }
      }

      // ── 3. Aplicar trocas temporárias ──
      const trocasAtivas = substituicoes.filter(s =>
        s.status === 'Aprovada' && form.dataPlantao >= s.dataInicio && form.dataPlantao <= s.dataFim
      );
      // Aplicar swaps nos nomes dos slots
      for (const t of trocasAtivas) {
        const slotsAtuais = [slotChefe, slotCrsBaMc, slotCrsBaLr, slotCrsBaRe1, slotCrsBaRe2,
          slotCci02BaMc, slotCci02BaCe, slotCci02Ba2, slotCci03BaMc, slotCci03Ba2_1, slotCci03Ba2_2];
        const setVars: ((v: string) => void)[] = [
          v => slotChefe = v, v => slotCrsBaMc = v, v => slotCrsBaLr = v,
          v => slotCrsBaRe1 = v, v => slotCrsBaRe2 = v, v => slotCci02BaMc = v,
          v => slotCci02BaCe = v, v => slotCci02Ba2 = v, v => slotCci03BaMc = v,
          v => slotCci03Ba2_1 = v, v => slotCci03Ba2_2 = v,
        ];
        const saindoNome = t.funcionarioNome;
        const entrandoNome = t.substitutoNome;
        // Procurar o "saindo" nos slots (pelo nomeGuerra ou nome completo)
        const idxSaindo = slotsAtuais.findIndex(s => {
          const b = all.find((bb: any) => bb.nomeGuerra === s || bb.nomeCompleto === s);
          return b && (b.nome === saindoNome || b.nomeCompleto === saindoNome || b.nomeGuerra === saindoNome);
        });
        const idxEntrando = slotsAtuais.findIndex(s => {
          const b = all.find((bb: any) => bb.nomeGuerra === s || bb.nomeCompleto === s);
          return b && (b.nome === entrandoNome || b.nomeCompleto === entrandoNome || b.nomeGuerra === entrandoNome);
        });
        if (idxSaindo !== -1 && idxEntrando !== -1) {
          const temp = slotsAtuais[idxSaindo];
          setVars[idxSaindo](slotsAtuais[idxEntrando]);
          setVars[idxEntrando](temp);
        } else if (idxSaindo !== -1) {
          // "Saindo" está num slot mas "entrando" não → substituir no pool
          const entrandoPool = pool.find(p => p.bombeiro.nome === entrandoNome || p.bombeiro.nomeCompleto === entrandoNome);
          if (entrandoPool) {
            setVars[idxSaindo](entrandoPool.bombeiro.nomeGuerra);
          }
        }
      }

      // ── 4. Preencher slots vazios com pool ──
      const buscarPool = (cargo: string) => {
        const idx = pool.findIndex(p => p.cargo === cargo && !usados.has(p.bombeiro.id));
        if (idx === -1) return null;
        usados.add(pool[idx].bombeiro.id);
        return pool[idx];
      };
      if (!slotChefe) { const p = buscarPool('BA-CE'); if (p) slotChefe = p.bombeiro.nomeGuerra; }
      if (!slotCrsBaMc) { const p = buscarPool('BA-MC'); if (p) slotCrsBaMc = p.bombeiro.nomeGuerra; }
      if (!slotCci02BaMc) { const p = buscarPool('BA-MC'); if (p) slotCci02BaMc = p.bombeiro.nomeGuerra; }
      if (!slotCci03BaMc) { const p = buscarPool('BA-MC'); if (p) slotCci03BaMc = p.bombeiro.nomeGuerra; }
      if (!slotCrsBaLr) { const p = buscarPool('BA-LR'); if (p) slotCrsBaLr = p.bombeiro.nomeGuerra; }
      if (!slotCrsBaRe1) { const p = buscarPool('BA-2') || buscarPool('BA-RE'); if (p) slotCrsBaRe1 = p.bombeiro.nomeGuerra; }
      if (!slotCrsBaRe2) { const p = buscarPool('BA-2') || buscarPool('BA-RE'); if (p) slotCrsBaRe2 = p.bombeiro.nomeGuerra; }
      if (!slotCci02Ba2) { const p = buscarPool('BA-2') || buscarPool('BA-RE'); if (p) slotCci02Ba2 = p.bombeiro.nomeGuerra; }
      if (!slotCci03Ba2_1) { const p = buscarPool('BA-2') || buscarPool('BA-RE'); if (p) slotCci03Ba2_1 = p.bombeiro.nomeGuerra; }
      if (!slotCci03Ba2_2) { const p = buscarPool('BA-2') || buscarPool('BA-RE'); if (p) slotCci03Ba2_2 = p.bombeiro.nomeGuerra; }

      // ── 5. Preencher escala de rádio ──
      let radioPreenchido: { funcao: string; nomeGuerra: string; horarioInicio: string; horarioFim: string }[] = [];
      if (mensal) {
        const plantaoDia = mensal.paradas.find((p: any) => p.dia === dateObj.getDate());
        let radioSlots: { horario: string; horarioFim: string; pessoaNomeGuerra: string; fixo: boolean }[] = [];
        if (plantaoDia && plantaoDia.radio.length > 0) {
          radioSlots = plantaoDia.radio;
        } else if (mensal.config.pessoas.some((p: any) => p?.id)) {
          const idxPlantao = dateObj.getDate();
          const radioGerado = gerarRadioPlantao(mensal.config.pessoas, idxPlantao, form.equipe);
          radioSlots = radioGerado;
        }
        if (radioSlots.length > 0) {
          radioPreenchido = radioSlots.map((r: any) => {
            const pessoa = all.find((bb: any) => bb.nomeGuerra === r.pessoaNomeGuerra);
            let nomeFinal = r.pessoaNomeGuerra;
            if (pessoa && isEmGozo(pessoa.id)) {
              const subInfo = encontrarSubstituto(pessoa.id);
              if (subInfo) {
                const sub = all.find((bb: any) => bb.id === subInfo.id);
                if (sub) nomeFinal = sub.nomeGuerra;
              }
            }
            const pessoaFinal = all.find((bb: any) => bb.nomeGuerra === nomeFinal);
            return {
              funcao: pessoaFinal?.cargo || 'BA-2',
              nomeGuerra: nomeFinal,
              horarioInicio: r.horario,
              horarioFim: r.horarioFim,
            };
          });
        }
      }

      setForm(f => ({
        ...f,
        chefeEquipe: slotChefe || f.chefeEquipe,
        guarnicoes: {
          crs: {
            baMc: slotCrsBaMc || f.guarnicoes?.crs?.baMc || '',
            baLr: slotCrsBaLr || f.guarnicoes?.crs?.baLr || '',
            baRe1: slotCrsBaRe1 || f.guarnicoes?.crs?.baRe1 || '',
            baRe2: slotCrsBaRe2 || f.guarnicoes?.crs?.baRe2 || '',
          },
          cci02: {
            baMc: slotCci02BaMc || f.guarnicoes?.cci02?.baMc || '',
            baCe: slotCci02BaCe || f.guarnicoes?.cci02?.baCe || '',
            ba2: slotCci02Ba2 || f.guarnicoes?.cci02?.ba2 || '',
          },
          cci03: {
            baMc: slotCci03BaMc || f.guarnicoes?.cci03?.baMc || '',
            ba2_1: slotCci03Ba2_1 || f.guarnicoes?.cci03?.ba2_1 || '',
            ba2_2: slotCci03Ba2_2 || f.guarnicoes?.cci03?.ba2_2 || '',
          },
        },
        radio: radioPreenchido.length > 0 ? radioPreenchido : f.radio,
      }));
    } catch (err) {
      console.error('Erro no auto-preenchimento:', err);
    } finally {
      setAutoFilling(false);
    }
  }

  function updateGuarnicao(section: 'cci02' | 'cci03' | 'crs', field: string, value: string) {
    setForm(f => ({
      ...f,
      guarnicoes: { ...f.guarnicoes, [section]: { ...((f.guarnicoes as any)?.[section]), [field]: value } },
    }));
  }

  function updateInstrutor(section: 'bds' | 'ptr1' | 'ptr2', field: 'funcao' | 'nomeGuerra', value: string) {
    setForm(f => ({
      ...f,
      [section]: { ...f[section], [field]: value, ...(field === 'funcao' ? { nomeGuerra: '' } : {}) },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Cabeçalho */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Equipe</label>
          <select value={form.equipe} onChange={e => updateEquipe(e.target.value)}
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated">
            {EQUIPES.map(eq => <option key={eq} value={eq} className={optionCls}>{eq}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Chefe de Equipe - SCI NVT</label>
          <SearchSelect value={form.chefeEquipe} onChange={v => setForm(f => ({ ...f, chefeEquipe: v }))} placeholder="Selecione o chefe" options={opcoesChefe} cargo="BA-CE" showCargo showEquipe />
          {form.chefeEquipe && (() => {
            const b = allBombeiros.find(x => x.nomeGuerra === form.chefeEquipe);
            const aviso = b ? validarCursoParaFuncao(b, 'BA-CE') : null;
            return aviso ? (
              <div className={`mt-1.5 flex items-start gap-2 rounded-lg px-2.5 py-2 text-[11px] leading-tight ${
                aviso.nivel === 'bloqueado'
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
              }`}>
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{aviso.mensagem}</span>
              </div>
            ) : null;
          })()}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Data do Plantão</label>
          <input type="date" value={form.dataPlantao} onChange={e => setForm(f => ({ ...f, dataPlantao: e.target.value }))}
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Turno</label>
          <input value={form.turno} disabled
            className="w-full rounded-xl border border-graphite-200/60 bg-graphite-100/50 px-3 py-2.5 text-sm text-graphite-400 dark:border-border-dark dark:bg-surface-card dark:text-graphite-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Horário Início</label>
          <input type="time" value={form.horarioInicio} disabled
            className="w-full rounded-xl border border-graphite-200/60 bg-graphite-100/50 px-3 py-2.5 text-sm text-graphite-400 dark:border-border-dark dark:bg-surface-card dark:text-graphite-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Horário Término</label>
          <input type="time" value={form.horarioTermino} disabled
            className="w-full rounded-xl border border-graphite-200/60 bg-graphite-100/50 px-3 py-2.5 text-sm text-graphite-400 dark:border-border-dark dark:bg-surface-card dark:text-graphite-500" />
        </div>
      </div>

      {/* Guarnições */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
          <Shield className="mr-1 inline h-4 w-4" /> Guarnições
        </legend>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* CCI 02 */}
          <div className="rounded-xl border border-graphite-200/60 bg-graphite-50/50 p-4 dark:border-border-dark dark:bg-surface-card/50">
            <h4 className="mb-3 text-sm font-bold text-graphite-700 dark:text-graphite-300">CCI 02</h4>
            <div className="space-y-3">
              <SlotFuncao label="BA-MC" value={form.guarnicoes?.cci02?.baMc || ''} onChange={v => updateGuarnicao('cci02', 'baMc', v)} allBombeiros={allBombeiros} veiculo="cci" options={opcoesBaMc} cargoFiltro="BA-MC" />
              <SlotFuncao label="BA-CE" value={form.guarnicoes?.cci02?.baCe || ''} onChange={v => updateGuarnicao('cci02', 'baCe', v)} allBombeiros={allBombeiros} options={opcoesChefe} cargoFiltro="BA-CE" />
              <SlotFuncao label="BA-2" value={form.guarnicoes?.cci02?.ba2 || ''} onChange={v => updateGuarnicao('cci02', 'ba2', v)} allBombeiros={allBombeiros} options={opcoesBa2} cargoFiltro="BA-2" />
            </div>
          </div>
          {/* CCI 03 */}
          <div className="rounded-xl border border-graphite-200/60 bg-graphite-50/50 p-4 dark:border-border-dark dark:bg-surface-card/50">
            <h4 className="mb-3 text-sm font-bold text-graphite-700 dark:text-graphite-300">CCI 03</h4>
            <div className="space-y-3">
              <SlotFuncao label="BA-MC" value={form.guarnicoes?.cci03?.baMc || ''} onChange={v => updateGuarnicao('cci03', 'baMc', v)} allBombeiros={allBombeiros} veiculo="cci" options={opcoesBaMc} cargoFiltro="BA-MC" />
              <SlotFuncao label="BA-2" value={form.guarnicoes?.cci03?.ba2_1 || ''} onChange={v => updateGuarnicao('cci03', 'ba2_1', v)} allBombeiros={allBombeiros} options={opcoesBa2} cargoFiltro="BA-2" />
              <SlotFuncao label="BA-2" value={form.guarnicoes?.cci03?.ba2_2 || ''} onChange={v => updateGuarnicao('cci03', 'ba2_2', v)} allBombeiros={allBombeiros} options={opcoesBa2} cargoFiltro="BA-2" />
            </div>
          </div>
          {/* CRS */}
          <div className="rounded-xl border border-graphite-200/60 bg-graphite-50/50 p-4 dark:border-border-dark dark:bg-surface-card/50">
            <h4 className="mb-3 text-sm font-bold text-graphite-700 dark:text-graphite-300">CRS</h4>
            <div className="space-y-3">
              <SlotFuncao label="BA-MC" value={form.guarnicoes?.crs?.baMc || ''} onChange={v => updateGuarnicao('crs', 'baMc', v)} allBombeiros={allBombeiros} veiculo="crs" options={opcoesBaMc} cargoFiltro="BA-MC" />
              <SlotFuncao label="BA-LR" value={form.guarnicoes?.crs?.baLr || ''} onChange={v => updateGuarnicao('crs', 'baLr', v)} allBombeiros={allBombeiros} options={opcoesBaLr} cargoFiltro="BA-LR" />
              <SlotFuncao label="BA-RE" value={form.guarnicoes?.crs?.baRe1 || ''} onChange={v => updateGuarnicao('crs', 'baRe1', v)} allBombeiros={allBombeiros} options={opcoesBaRe} />
              <SlotFuncao label="BA-RE" value={form.guarnicoes?.crs?.baRe2 || ''} onChange={v => updateGuarnicao('crs', 'baRe2', v)} allBombeiros={allBombeiros} options={opcoesBaRe} />
            </div>
          </div>
        </div>
      </fieldset>

      {/* BDS / PTR-1 / PTR-2 */}
      {(['bds', 'ptr1', 'ptr2'] as const).map(section => {
        const funcaoSelecionada = form[section].funcao;
        const isApoc = funcaoSelecionada === 'APOC';
        const instrutorOptions = isApoc
          ? undefined
          : funcaoSelecionada
            ? opcoesPorCargo([funcaoSelecionada])
            : efetivoOptions;
        return (
        <fieldset key={section}>
          <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
            <FileText className="mr-1 inline h-4 w-4" /> {section === 'bds' ? 'BDS' : section === 'ptr1' ? 'PTR-1' : 'PTR-2'}
          </legend>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <label className="mb-1 block text-xs font-medium text-graphite-500 dark:text-graphite-400">Função do Instrutor</label>
              <select value={funcaoSelecionada} onChange={e => updateInstrutor(section, 'funcao', e.target.value)}
                className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated">
                <option value="" className={optionCls}>Selecione</option>
                {FUNCOES_BDS_PTR.map(f => <option key={f} value={f} className={optionCls}>{f}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="mb-1 block text-xs font-medium text-graphite-500 dark:text-graphite-400">Nome de Guerra (Instrutor)</label>
              <SearchSelect
                value={form[section].nomeGuerra}
                onChange={v => updateInstrutor(section, 'nomeGuerra', v)}
                placeholder="Nome de guerra"
                cargo={isApoc ? 'APOC' : undefined}
                options={instrutorOptions}
                showCargo
                showEquipe
              />
            </div>
          </div>
        </fieldset>
        );
      })}

      {/* Atestados */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
          <FileText className="mr-1 inline h-4 w-4" /> Atestados
        </legend>
        <div className="space-y-2">
          {form.atestados.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={a} onChange={e => {
                const next = [...form.atestados];
                next[i] = e.target.value;
                setForm(f => ({ ...f, atestados: next }));
              }} placeholder="Nome do funcionário com atestado"
                className="flex-1 rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated" />
              <button type="button" onClick={() => setForm(f => ({ ...f, atestados: f.atestados.filter((_, j) => j !== i) }))}
              className="rounded-xl p-1.5 text-alert-red transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setForm(f => ({ ...f, atestados: [...f.atestados, ''] }))}
            className="flex items-center gap-1 text-sm text-aviation-600 hover:text-aviation-700 dark:text-aviation-400">
            <Plus className="h-4 w-4" /> Adicionar atestado
          </button>
        </div>
      </fieldset>

      {/* Trocas (automáticas - somente leitura) */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
          <Users className="mr-1 inline h-4 w-4" /> Trocas {form.trocas.length > 0 && <span className="ml-1 text-[10px] text-amber-600">(automáticas - carregadas do sistema)</span>}
        </legend>
        {form.trocas.length === 0 ? (
          <p className="text-sm text-graphite-400 dark:text-graphite-500">Nenhuma troca registrada para este plantão.</p>
        ) : (
          <div className="space-y-2">
            {form.trocas.map((t, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/10">
                <ArrowRightLeft className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-medium text-graphite-900 dark:text-graphite-100">{t.nomeSaindo}</span>
                  <span className="mx-1.5 text-graphite-400">({t.funcaoSaindo})</span>
                  <ArrowRight className="mx-1 inline h-3 w-3 text-amber-500" />
                  <span className="font-medium text-graphite-900 dark:text-graphite-100">{t.nomeEntrando}</span>
                  <span className="mx-1.5 text-graphite-400">({t.funcaoEntrando})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {/* Escala de Rádio */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
          <Radio className="mr-1 inline h-4 w-4" /> Escala de Rádio
        </legend>
        <div className="space-y-4">
          {form.radio.map((r, i) => {
            const isApoc = r.funcao === 'APOC';
            const radioOptions = isApoc
              ? undefined
              : r.funcao
                ? opcoesPorCargo([r.funcao])
                : efetivoOptions;
            return (
            <div key={i} className="rounded-xl border border-graphite-200/60 bg-graphite-50/50 p-4 dark:border-border-dark dark:bg-surface-card/50">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-graphite-500">Rádio {i + 1}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, radio: f.radio.filter((_, j) => j !== i) }))}
                  className="rounded-xl p-1.5 text-alert-red transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-graphite-500">Função</label>
                  <select value={r.funcao} onChange={e => {
                    const next = [...form.radio];
                    next[i] = { ...next[i], funcao: e.target.value, nomeGuerra: '' };
                    setForm(f => ({ ...f, radio: next }));
                  }}
                    className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated">
                    <option value="" className={optionCls}>Selecione</option>
                    {FUNCOES_BDS_PTR.map(f => <option key={f} value={f} className={optionCls}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-graphite-500">Nome de Guerra</label>
                  <SearchSelect value={r.nomeGuerra} onChange={v => {
                    const next = [...form.radio];
                    next[i] = { ...next[i], nomeGuerra: v };
                    setForm(f => ({ ...f, radio: next }));
                  }} placeholder="Nome de guerra" cargo={isApoc ? 'APOC' : undefined} options={radioOptions} showCargo showEquipe />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-graphite-500">Início</label>
                  <input type="time" value={r.horarioInicio} onChange={e => {
                    const next = [...form.radio];
                    next[i] = { ...next[i], horarioInicio: e.target.value };
                    setForm(f => ({ ...f, radio: next }));
                  }}
                    className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-graphite-500">Fim</label>
                  <input type="time" value={r.horarioFim} onChange={e => {
                    const next = [...form.radio];
                    next[i] = { ...next[i], horarioFim: e.target.value };
                    setForm(f => ({ ...f, radio: next }));
                  }}
                    className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated" />
                </div>
              </div>
            </div>
            );
          })}
          <button type="button" onClick={() => setForm(f => ({ ...f, radio: [...f.radio, { funcao: '', nomeGuerra: '', horarioInicio: '', horarioFim: '' }] }))}
            className="flex items-center gap-1 text-sm text-aviation-600 hover:text-aviation-700 dark:text-aviation-400">
            <Plus className="h-4 w-4" /> Adicionar escala de rádio
          </button>
        </div>
      </fieldset>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-graphite-200 pt-6 dark:border-border-dark">
        <button type="button" onClick={autoPreencherGuarnicoes} disabled={autoFilling}
          className="flex items-center gap-2 rounded-xl border border-aviation-300 bg-white px-4 py-2.5 text-sm font-medium text-aviation-700 transition-all duration-200 hover:bg-aviation-50 disabled:opacity-50 dark:border-aviation-700 dark:bg-aviation-900/20 dark:text-aviation-300 dark:hover:bg-aviation-900/30">
          {autoFilling ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-aviation-700 border-t-transparent dark:border-aviation-300" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {autoFilling ? 'Preenchendo...' : 'Auto-Preenchimento'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-xl border border-graphite-300/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-graphite-700 backdrop-blur-sm transition-all duration-200 hover:bg-graphite-50 hover:border-graphite-300 dark:border-border-dark dark:bg-surface-card/80 dark:text-graphite-200 dark:hover:bg-surface-hover/50">
          Cancelar
        </button>
        <button type="submit"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
          <Save className="h-4 w-4" />
          {escala ? 'Salvar Alterações' : 'Criar Escala'}
        </button>
      </div>
    </form>
  );
}

// ─── LIST VIEW ──────────────────────────────────────────────
function EscalaCard({ escala, onView, onEdit, onDelete, onClone, isAdmin }: {
  escala: EscalaDiaria;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClone: () => void;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [vigenciasAtivas, setVigenciasAtivas] = useState<VigenciaSubstituicao[]>([]);

  useEffect(() => {
    if (!escala.dataPlantao || !escala.equipe) return;
    listarVigencias({ equipe: escala.equipe, ativa: true, dataInicio: escala.dataPlantao, dataFim: escala.dataPlantao })
      .then(setVigenciasAtivas)
      .catch(() => setVigenciasAtivas([]));
  }, [escala.dataPlantao, escala.equipe]);

  return (
    <div className="rounded-2xl border border-graphite-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-aviation-50 to-aviation-100 shadow-sm dark:from-aviation-900/30 dark:to-aviation-800/20">
            <Calendar className="h-5 w-5 text-aviation-600 dark:text-aviation-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-graphite-900 dark:text-graphite-100">
              {escala.equipe} - {formatDate(escala.dataPlantao)}
            </p>
            <p className="text-xs text-graphite-500">
              {escala.turno} · {escala.horarioInicio} às {escala.horarioTermino}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onView} title="Visualizar"
            className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={onEdit} title="Editar"
            className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onClone} title="Clonar"
            className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300">
            <Copy className="h-4 w-4" />
          </button>
          {isAdmin && (
            <button onClick={onDelete} title="Excluir"
              className="rounded-xl p-1.5 text-alert-red transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-graphite-200 pt-4 dark:border-border-dark">
          {/* Guarnições */}
          <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Guarnições</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-graphite-400">CCI 02</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes?.cci02?.baMc || '-'}</p>
              <p className="text-sm">BA-CE: {escala.guarnicoes?.cci02?.baCe || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes?.cci02?.ba2 || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-400">CCI 03</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes?.cci03?.baMc || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes?.cci03?.ba2_1 || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes?.cci03?.ba2_2 || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-400">CRS</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes?.crs?.baMc || '-'}</p>
              <p className="text-sm">BA-LR: {escala.guarnicoes?.crs?.baLr || '-'}</p>
              <p className="text-sm">BA-RE: {escala.guarnicoes?.crs?.baRe1 || '-'}</p>
              <p className="text-sm">BA-RE: {escala.guarnicoes?.crs?.baRe2 || '-'}</p>
            </div>
          </div>

          {/* Substituições Ativas */}
          {vigenciasAtivas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Substituições Ativas</p>
              <div className="space-y-1">
                {vigenciasAtivas.map((v, i) => (
                  <p key={i} className="text-sm">
                    <span className="font-medium text-graphite-900 dark:text-graphite-100">{v.substitutoNome}</span>
                    <span className="mx-1.5 text-graphite-400">({v.cargoExercido})</span>
                    <span className="text-graphite-400">→ substitui </span>
                    <span className="font-medium text-graphite-900 dark:text-graphite-100">{v.funcionarioOriginalNome}</span>
                    <span className="mx-1.5 text-graphite-400">({v.motivo === 'ferias' ? 'férias' : 'cascata'})</span>
                    <span className="ml-2 text-[10px] text-graphite-400">nível {v.nivelCascata}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* BDS/PTR */}
          {([['BDS', escala.bds], ['PTR-1', escala.ptr1], ['PTR-2', escala.ptr2]] as const).map(([label, slot]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">{label}</p>
              <p className="text-sm">{slot?.funcao || '-'}: {slot?.nomeGuerra || '-'}</p>
            </div>
          ))}

          {escala.atestados.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Atestados</p>
              {escala.atestados.map((a, i) => <p key={i} className="text-sm">{a}</p>)}
            </div>
          )}

          {escala.trocas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Trocas</p>
              {escala.trocas.map((t, i) => (
                <p key={i} className="text-sm">
                  {t.funcaoSaindo} {t.nomeSaindo} ↔ {t.funcaoEntrando} {t.nomeEntrando}
                </p>
              ))}
            </div>
          )}

          {escala.radio.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Escala de Rádio</p>
              {escala.radio.map((r, i) => (
                <p key={i} className="text-sm">{r.funcao} {r.nomeGuerra} - {r.horarioInicio} às {r.horarioFim}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────
export function EscalaDiariaView() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';
  const username = user?.username || '';
  const [escalas, setEscalas] = useState<EscalaDiaria[]>([]);
  const [mode, setMode] = useState<'list' | 'form' | 'view'>('list');
  const [editando, setEditando] = useState<EscalaDiaria | null>(null);
  const [visualizando, setVisualizando] = useState<EscalaDiaria | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filtroEquipe, setFiltroEquipe] = useState('');
  const [filterMode, setFilterMode] = useState<'mes-ano' | 'periodo'>('mes-ano');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const escalasFiltradas = useMemo(() => {
    let lista = escalas;
    if (filtroEquipe) lista = lista.filter(e => e.equipe === filtroEquipe);
    if (filterMode === 'mes-ano') {
      if (filtroAno) lista = lista.filter(e => e.dataPlantao?.startsWith(filtroAno));
      if (filtroMes) lista = lista.filter(e => (new Date(e.dataPlantao).getMonth() + 1).toString() === filtroMes);
    } else {
      if (dataInicio) lista = lista.filter(e => e.dataPlantao >= dataInicio);
      if (dataFinal) lista = lista.filter(e => e.dataPlantao <= dataFinal);
    }
    return lista;
  }, [escalas, filtroEquipe, filterMode, filtroAno, filtroMes, dataInicio, dataFinal]);

  async function carregar() {
    const todas = await listarEscalas();
    if (isAdmin) {
      setEscalas(todas);
    } else {
      setEscalas(todas.filter(e => e.createdBy === username));
    }
  }

  useEffect(() => { carregar(); }, [isAdmin, username]);

  async function handleSave(data: Omit<EscalaDiaria, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) {
    let saved: EscalaDiaria | null;
    if (editando && editando.id) {
      saved = await atualizarEscala(editando.id, data);
    } else {
      saved = await criarEscala({ ...data, createdBy: username });
    }
    setEditando(null);
    carregar();
    if (saved) {
      setVisualizando(saved);
      setMode('view');
    } else {
      setMode('list');
    }
  }

  function handleClone(e: EscalaDiaria) {
    setEditando({
      ...e,
      id: '',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
      dataPlantao: new Date().toISOString().split('T')[0],
    });
    setMode('form');
  }

  async function handleDelete(id: string) {
    await excluirEscala(id);
    setConfirmDelete(null);
    carregar();
  }


  if (mode === 'form') {
    return (
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
            {editando?.id ? 'Editar Escala Diária' : editando && !editando.id ? 'Clonar Escala Diária' : 'Nova Escala Diária'}
          </h3>
        </div>
        <EscalaDiariaForm escala={editando || undefined} onSave={handleSave} onCancel={() => { setMode('list'); setEditando(null); }} />
      </div>
    );
  }

  if (mode === 'view' && visualizando) {
    return (
      <ViewMode escala={visualizando} onBack={() => setMode('list')} />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-xl border border-graphite-300/60 bg-white/70 text-xs font-medium dark:border-border-dark dark:bg-surface-card">
            <button onClick={() => setFilterMode('mes-ano')}
              className={`px-3 py-2 transition-colors ${filterMode === 'mes-ano' ? 'bg-aviation-600 text-white' : 'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover'}`}>
              Mês/Ano
            </button>
            <button onClick={() => setFilterMode('periodo')}
              className={`px-3 py-2 transition-colors ${filterMode === 'periodo' ? 'bg-aviation-600 text-white' : 'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover'}`}>
              Período
            </button>
          </div>
          {filterMode === 'mes-ano' ? (
            <>
              <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className={inputClass}>
                <option value="">Todos</option>
                {ANOS.map(a => <option key={a} value={a} className={optionCls}>{a}</option>)}
              </select>
              <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={inputClass}>
                <option value="">Todos os meses</option>
                {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1} className={optionCls}>{m}</option>)}
              </select>
            </>
          ) : (
            <>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inputClass} placeholder="Data início" />
              <span className="text-xs text-graphite-400">a</span>
              <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} className={inputClass} placeholder="Data fim" />
            </>
          )}
          {isAdmin && (
            <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)} className={inputClass}>
              <option value="" className={optionCls}>Todas as equipes</option>
              {EQUIPES.map(eq => <option key={eq} value={eq} className={optionCls}>{eq}</option>)}
            </select>
          )}
          <p className="text-sm text-graphite-500 dark:text-graphite-400">
            {escalasFiltradas.length} escala(s)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setEditando(null); setMode('form'); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Nova Escala Diária
          </button>
        </div>
      </div>

      {escalasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
          <Calendar className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhuma escala encontrada</h3>
          <p className="text-sm text-graphite-400">Clique em "Nova Escala Diária" para criar a primeira.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {escalasFiltradas.map(e => (
            <EscalaCard
              key={e.id}
              escala={e}
              isAdmin={isAdmin}
              onView={() => { setVisualizando(e); setMode('view'); }}
              onEdit={() => { setEditando(e); setMode('form'); }}
              onClone={() => handleClone(e)}
              onDelete={() => setConfirmDelete(e.id)}
            />
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-xl shadow-black/5 backdrop-blur-sm dark:bg-surface-elevated/95 dark:shadow-black/20">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500">Tem certeza que deseja excluir esta escala?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-graphite-300/60 bg-white/80 px-4 py-2 text-sm font-medium text-graphite-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-graphite-50 hover:border-graphite-300 dark:border-border-dark dark:bg-surface-card/80 dark:text-graphite-200 dark:hover:bg-surface-hover/50">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98]">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewMode({ escala, onBack }: { escala: EscalaDiaria; onBack: () => void }) {
  const [vigenciasAtivas, setVigenciasAtivas] = useState<VigenciaSubstituicao[]>([]);

  useEffect(() => {
    if (!escala.dataPlantao || !escala.equipe) return;
    listarVigencias({ equipe: escala.equipe, ativa: true, dataInicio: escala.dataPlantao, dataFim: escala.dataPlantao })
      .then(setVigenciasAtivas)
      .catch(() => setVigenciasAtivas([]));
  }, [escala.dataPlantao, escala.equipe]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print-hidden">
        <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
          Escala Diária - {escala.equipe} - {formatDate(escala.dataPlantao)}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button onClick={onBack}
            className="rounded-xl border border-graphite-300/60 bg-white/80 px-3 py-1.5 text-sm font-medium text-graphite-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-graphite-50 hover:border-graphite-300 dark:border-border-dark dark:bg-surface-card/80 dark:text-graphite-200 dark:hover:bg-surface-hover/50">
            Fechar
          </button>
        </div>
      </div>
      <div id="print-area" className="rounded-2xl border border-graphite-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-border-dark dark:bg-surface-card print:border-none print:shadow-none">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-graphite-400">Equipe</p>
            <p className="text-sm font-medium">{escala.equipe}</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Chefe de Equipe</p>
            <p className="text-sm font-medium">{escala.chefeEquipe || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Data</p>
            <p className="text-sm font-medium">{formatDate(escala.dataPlantao)}</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Horário</p>
            <p className="text-sm font-medium">{escala.horarioInicio} às {escala.horarioTermino}</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Turno</p>
            <p className="text-sm font-medium">{escala.turno}</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Guarnições</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/60 p-3 backdrop-blur-sm dark:bg-surface-card/60">
              <p className="mb-1 text-xs font-bold text-graphite-500">CCI 02</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes?.cci02?.baMc || '-'}</p>
              <p className="text-sm">BA-CE: {escala.guarnicoes?.cci02?.baCe || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes?.cci02?.ba2 || '-'}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 backdrop-blur-sm dark:bg-surface-card/60">
              <p className="mb-1 text-xs font-bold text-graphite-500">CCI 03</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes?.cci03?.baMc || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes?.cci03?.ba2_1 || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes?.cci03?.ba2_2 || '-'}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 backdrop-blur-sm dark:bg-surface-card/60">
              <p className="mb-1 text-xs font-bold text-graphite-500">CRS</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes?.crs?.baMc || '-'}</p>
              <p className="text-sm">BA-LR: {escala.guarnicoes?.crs?.baLr || '-'}</p>
              <p className="text-sm">BA-RE: {escala.guarnicoes?.crs?.baRe1 || '-'}</p>
              <p className="text-sm">BA-RE: {escala.guarnicoes?.crs?.baRe2 || '-'}</p>
            </div>
          </div>
        </div>

        {/* Substituições Ativas */}
        {vigenciasAtivas.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Substituições Ativas</p>
            <div className="space-y-1">
              {vigenciasAtivas.map((v, i) => (
                <p key={i} className="text-sm">
                  <span className="font-medium text-graphite-900 dark:text-graphite-100">{v.substitutoNome}</span>
                  <span className="mx-1.5 text-graphite-400">({v.cargoExercido})</span>
                  <span className="text-graphite-400">→ substitui </span>
                  <span className="font-medium text-graphite-900 dark:text-graphite-100">{v.funcionarioOriginalNome}</span>
                  <span className="mx-1.5 text-graphite-400">({v.motivo === 'ferias' ? 'férias' : 'cascata'})</span>
                  <span className="ml-2 text-[10px] text-graphite-400">nível {v.nivelCascata}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {([['BDS', escala.bds], ['PTR-1', escala.ptr1], ['PTR-2', escala.ptr2]] as const).map(([label, slot]) => (
          <div key={label} className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">{label}</p>
            <p className="text-sm">{slot?.funcao || '-'}: {slot?.nomeGuerra || '-'}</p>
          </div>
        ))}

        {escala.atestados.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Atestados</p>
            {escala.atestados.map((a, i) => <p key={i} className="text-sm">- {a}</p>)}
          </div>
        )}

        {escala.trocas.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Trocas</p>
            {escala.trocas.map((t, i) => (
              <p key={i} className="text-sm">- {t.funcaoSaindo} {t.nomeSaindo} ↔ {t.funcaoEntrando} {t.nomeEntrando}</p>
            ))}
          </div>
        )}

        {escala.radio.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Escala de Rádio</p>
            {escala.radio.map((r, i) => (
              <p key={i} className="text-sm">- {r.funcao} {r.nomeGuerra}: {r.horarioInicio} às {r.horarioFim}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
