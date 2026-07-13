import { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Shield, Users, Plus, Trash2, FileText, Radio,
  ChevronDown, ChevronUp, Save, Eye, Pencil, Copy, Printer,
  AlertTriangle, X as XIcon,
  ArrowRightLeft, ArrowRight,
} from 'lucide-react';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { useAuth } from '../../context/AuthContext';
import { listarEscalas, criarEscala, atualizarEscala, excluirEscala } from '../../services/escalaService';
import { listarBombeiros } from '../../services/bombeiroService';
import { listarSubstituicoesTemporarias } from '../../services/substituicaoTemporariaService';
import { FUNCOES_BDS_PTR } from '../../types/escala';
import type { EscalaDiaria } from '../../types/escala';
import type { Bombeiro, Cargo } from '../../types/bombeiro';
import type { SubstituicaoTemporaria } from '../../types/substituicaoTemporaria';
import { validarCursoParaFuncao } from '../../utils/validacaoCursos';

const EQUIPES = ['Alfa', 'Bravo', 'Charlie', 'Delta'] as const;

const optionCls = 'dark:bg-graphite-700 dark:text-graphite-100';

function emptyGuarnicoes() {
  return {
    cci02: { baMc: '', baCe: '', ba2: '' },
    cci03: { baMc: '', ba2_1: '', ba2_2: '' },
    crs: { baMc: '', baLr: '', baRe1: '', baRe2: '' },
  };
}

function emptyEscala(): Omit<EscalaDiaria, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  return {
    equipe: 'Alfa',
    chefeEquipe: '',
    dataPlantao: new Date().toISOString().split('T')[0],
    horarioInicio: '07:00',
    horarioTermino: '19:00',
    turno: 'Diurno',
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
  if (equipe === 'Alfa' || equipe === 'Charlie') {
    return { horarioInicio: '07:00', horarioTermino: '19:00', turno: 'Diurno' };
  }
  return { horarioInicio: '19:00', horarioTermino: '07:00', turno: 'Noturno' };
}

const SLOT_ROLE_MAP: Record<string, Cargo> = {
  'BA-CE': 'BA-CE',
  'BA-LR': 'BA-LR',
  'BA-MC': 'BA-MC',
};

function SlotFuncao({ label, value, onChange, allBombeiros }: { label: string; value: string; onChange: (v: string) => void; allBombeiros: Bombeiro[] }) {
  const role = SLOT_ROLE_MAP[label];
  const selecionado = value ? allBombeiros.find(b => b.nomeGuerra === value) : null;
  const aviso = selecionado && role ? validarCursoParaFuncao(selecionado, role) : null;

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-graphite-500 dark:text-graphite-400">{label}</p>
      <SearchSelect value={value} onChange={onChange} placeholder={`Selecione ${label}`} />
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
  const [substituicoes, setSubstituicoes] = useState<SubstituicaoTemporaria[]>([]);

  useEffect(() => { listarBombeiros().then(setAllBombeiros); }, []);

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
    if (aprovadas.length === 0) return;
    setForm(f => {
      const novasTrocas = aprovadas.map(s => ({
        funcaoSaindo: s.funcionarioCargo || '',
        nomeSaindo: s.funcionarioNome,
        funcaoEntrando: s.substitutoCargo || '',
        nomeEntrando: s.substitutoNome,
      }));
      const combinadas = [...f.trocas, ...novasTrocas.filter(n =>
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

  function updateEquipe(equipe: string) {
    const auto = autoPreencher(equipe);
    const membros = allBombeiros.filter(b => b.equipe === equipe);
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
      chefeEquipe: chefe || f.chefeEquipe,
      guarnicoes: {
        crs: { baMc: mc1 || f.guarnicoes.crs.baMc, baLr: lr || f.guarnicoes.crs.baLr, baRe1: b2_1 || f.guarnicoes.crs.baRe1, baRe2: b2_2 || f.guarnicoes.crs.baRe2 },
        cci02: { baMc: mc2 || f.guarnicoes.cci02.baMc, baCe: chefe || f.guarnicoes.cci02.baCe, ba2: b2_3 || f.guarnicoes.cci02.ba2 },
        cci03: { baMc: mc3 || f.guarnicoes.cci03.baMc, ba2_1: b2_4 || f.guarnicoes.cci03.ba2_1, ba2_2: b2_5 || f.guarnicoes.cci03.ba2_2 },
      },
    }));
  }

  function updateGuarnicao(section: 'cci02' | 'cci03' | 'crs', field: string, value: string) {
    setForm(f => ({
      ...f,
      guarnicoes: { ...f.guarnicoes, [section]: { ...f.guarnicoes[section], [field]: value } },
    }));
  }

  function updateInstrutor(section: 'bds' | 'ptr1' | 'ptr2', field: 'funcao' | 'nomeGuerra', value: string) {
    setForm(f => ({
      ...f,
      [section]: { ...f[section], [field]: value },
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
          <SearchSelect value={form.chefeEquipe} onChange={v => setForm(f => ({ ...f, chefeEquipe: v }))} placeholder="Selecione o chefe" />
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
              <SlotFuncao label="BA-MC" value={form.guarnicoes.cci02.baMc} onChange={v => updateGuarnicao('cci02', 'baMc', v)} allBombeiros={allBombeiros} />
              <SlotFuncao label="BA-CE" value={form.guarnicoes.cci02.baCe} onChange={v => updateGuarnicao('cci02', 'baCe', v)} allBombeiros={allBombeiros} />
              <SlotFuncao label="BA-2" value={form.guarnicoes.cci02.ba2} onChange={v => updateGuarnicao('cci02', 'ba2', v)} allBombeiros={allBombeiros} />
            </div>
          </div>
          {/* CCI 03 */}
          <div className="rounded-xl border border-graphite-200/60 bg-graphite-50/50 p-4 dark:border-border-dark dark:bg-surface-card/50">
            <h4 className="mb-3 text-sm font-bold text-graphite-700 dark:text-graphite-300">CCI 03</h4>
            <div className="space-y-3">
              <SlotFuncao label="BA-MC" value={form.guarnicoes.cci03.baMc} onChange={v => updateGuarnicao('cci03', 'baMc', v)} allBombeiros={allBombeiros} />
              <SlotFuncao label="BA-2" value={form.guarnicoes.cci03.ba2_1} onChange={v => updateGuarnicao('cci03', 'ba2_1', v)} allBombeiros={allBombeiros} />
              <SlotFuncao label="BA-2" value={form.guarnicoes.cci03.ba2_2} onChange={v => updateGuarnicao('cci03', 'ba2_2', v)} allBombeiros={allBombeiros} />
            </div>
          </div>
          {/* CRS */}
          <div className="rounded-xl border border-graphite-200/60 bg-graphite-50/50 p-4 dark:border-border-dark dark:bg-surface-card/50">
            <h4 className="mb-3 text-sm font-bold text-graphite-700 dark:text-graphite-300">CRS</h4>
            <div className="space-y-3">
              <SlotFuncao label="BA-MC" value={form.guarnicoes.crs.baMc} onChange={v => updateGuarnicao('crs', 'baMc', v)} allBombeiros={allBombeiros} />
              <SlotFuncao label="BA-LR" value={form.guarnicoes.crs.baLr} onChange={v => updateGuarnicao('crs', 'baLr', v)} allBombeiros={allBombeiros} />
              <SlotFuncao label="BA-RE" value={form.guarnicoes.crs.baRe1} onChange={v => updateGuarnicao('crs', 'baRe1', v)} allBombeiros={allBombeiros} />
              <SlotFuncao label="BA-RE" value={form.guarnicoes.crs.baRe2} onChange={v => updateGuarnicao('crs', 'baRe2', v)} allBombeiros={allBombeiros} />
            </div>
          </div>
        </div>
      </fieldset>

      {/* BDS / PTR-1 / PTR-2 */}
      {(['bds', 'ptr1', 'ptr2'] as const).map(section => (
        <fieldset key={section}>
          <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
            <FileText className="mr-1 inline h-4 w-4" /> {section === 'bds' ? 'BDS' : section === 'ptr1' ? 'PTR-1' : 'PTR-2'}
          </legend>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <label className="mb-1 block text-xs font-medium text-graphite-500 dark:text-graphite-400">Função do Instrutor</label>
              <select value={form[section].funcao} onChange={e => updateInstrutor(section, 'funcao', e.target.value)}
                className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated">
                <option value="" className={optionCls}>Selecione</option>
                {FUNCOES_BDS_PTR.map(f => <option key={f} value={f} className={optionCls}>{f}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="mb-1 block text-xs font-medium text-graphite-500 dark:text-graphite-400">Nome de Guerra (Instrutor)</label>
              <SearchSelect value={form[section].nomeGuerra} onChange={v => updateInstrutor(section, 'nomeGuerra', v)} placeholder="Nome de guerra" />
            </div>
          </div>
        </fieldset>
      ))}

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
          {form.radio.map((r, i) => (
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
                    next[i] = { ...next[i], funcao: e.target.value };
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
                  }} placeholder="Nome de guerra" />
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
          ))}
          <button type="button" onClick={() => setForm(f => ({ ...f, radio: [...f.radio, { funcao: '', nomeGuerra: '', horarioInicio: '', horarioFim: '' }] }))}
            className="flex items-center gap-1 text-sm text-aviation-600 hover:text-aviation-700 dark:text-aviation-400">
            <Plus className="h-4 w-4" /> Adicionar escala de rádio
          </button>
        </div>
      </fieldset>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-graphite-200 pt-6 dark:border-border-dark">
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
              <p className="text-sm">BA-MC: {escala.guarnicoes.cci02.baMc || '-'}</p>
              <p className="text-sm">BA-CE: {escala.guarnicoes.cci02.baCe || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes.cci02.ba2 || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-400">CCI 03</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes.cci03.baMc || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes.cci03.ba2_1 || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes.cci03.ba2_2 || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-graphite-400">CRS</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes.crs.baMc || '-'}</p>
              <p className="text-sm">BA-LR: {escala.guarnicoes.crs.baLr || '-'}</p>
              <p className="text-sm">BA-RE: {escala.guarnicoes.crs.baRe1 || '-'}</p>
              <p className="text-sm">BA-RE: {escala.guarnicoes.crs.baRe2 || '-'}</p>
            </div>
          </div>

          {/* BDS/PTR */}
          {([['BDS', escala.bds], ['PTR-1', escala.ptr1], ['PTR-2', escala.ptr2]] as const).map(([label, slot]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">{label}</p>
              <p className="text-sm">{slot.funcao || '-'}: {slot.nomeGuerra || '-'}</p>
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

  const escalasFiltradas = filtroEquipe ? escalas.filter(e => e.equipe === filtroEquipe) : escalas;

  function carregar() {
    const todas = listarEscalas();
    if (isAdmin) {
      setEscalas(todas);
    } else {
      setEscalas(todas.filter(e => e.createdBy === username));
    }
  }

  useEffect(() => { carregar(); }, [isAdmin, username]);

  function handleSave(data: Omit<EscalaDiaria, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) {
    let saved: EscalaDiaria | null;
    if (editando && editando.id) {
      saved = atualizarEscala(editando.id, data);
    } else {
      saved = criarEscala({ ...data, createdBy: username });
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

  function handleDelete(id: string) {
    excluirEscala(id);
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
        <div className="flex items-center gap-3">
          <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)}
            className="rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated">
            <option value="" className={optionCls}>Todas as equipes</option>
            {EQUIPES.map(eq => <option key={eq} value={eq} className={optionCls}>{eq}</option>)}
          </select>
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
              <p className="text-sm">BA-MC: {escala.guarnicoes.cci02.baMc || '-'}</p>
              <p className="text-sm">BA-CE: {escala.guarnicoes.cci02.baCe || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes.cci02.ba2 || '-'}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 backdrop-blur-sm dark:bg-surface-card/60">
              <p className="mb-1 text-xs font-bold text-graphite-500">CCI 03</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes.cci03.baMc || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes.cci03.ba2_1 || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes.cci03.ba2_2 || '-'}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3 backdrop-blur-sm dark:bg-surface-card/60">
              <p className="mb-1 text-xs font-bold text-graphite-500">CRS</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes.crs.baMc || '-'}</p>
              <p className="text-sm">BA-LR: {escala.guarnicoes.crs.baLr || '-'}</p>
              <p className="text-sm">BA-RE: {escala.guarnicoes.crs.baRe1 || '-'}</p>
              <p className="text-sm">BA-RE: {escala.guarnicoes.crs.baRe2 || '-'}</p>
            </div>
          </div>
        </div>

        {([['BDS', escala.bds], ['PTR-1', escala.ptr1], ['PTR-2', escala.ptr2]] as const).map(([label, slot]) => (
          <div key={label} className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">{label}</p>
            <p className="text-sm">{slot.funcao || '-'}: {slot.nomeGuerra || '-'}</p>
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
