import { useState, useEffect } from 'react';
import {
  Calendar, Shield, Users, Plus, Trash2, FileText, Radio,
  ChevronDown, ChevronUp, Save, Eye, Pencil, Copy, Printer,
} from 'lucide-react';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { useAuth } from '../../context/AuthContext';
import { listarEscalas, criarEscala, atualizarEscala, excluirEscala } from '../../services/escalaService';
import { FUNCOES_BDS_PTR } from '../../types/escala';
import type { EscalaDiaria } from '../../types/escala';

const EQUIPES = ['Alfa', 'Bravo', 'Charlie', 'Delta'] as const;

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

function SlotFuncao({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-graphite-500 dark:text-graphite-400">{label}</p>
      <SearchSelect value={value} onChange={onChange} placeholder={`Selecione ${label}`} />
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
    setForm(f => ({ ...f, equipe, ...auto }));
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
            className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
            {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Chefe de Equipe - SESCINC</label>
          <SearchSelect value={form.chefeEquipe} onChange={v => setForm(f => ({ ...f, chefeEquipe: v }))} placeholder="Selecione o chefe" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Data do Plantão</label>
          <input type="date" value={form.dataPlantao} onChange={e => setForm(f => ({ ...f, dataPlantao: e.target.value }))}
            className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Turno</label>
          <input value={form.turno} disabled
            className="w-full rounded-lg border border-graphite-200 bg-graphite-50 px-3 py-2 text-sm text-graphite-500 dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Horário Início</label>
          <input type="time" value={form.horarioInicio} disabled
            className="w-full rounded-lg border border-graphite-200 bg-graphite-50 px-3 py-2 text-sm text-graphite-500 dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-400" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Horário Término</label>
          <input type="time" value={form.horarioTermino} disabled
            className="w-full rounded-lg border border-graphite-200 bg-graphite-50 px-3 py-2 text-sm text-graphite-500 dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-400" />
        </div>
      </div>

      {/* Guarnições */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
          <Shield className="mr-1 inline h-4 w-4" /> Guarnições
        </legend>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* CCI 02 */}
          <div className="rounded-lg border border-graphite-200 bg-graphite-50/50 p-4 dark:border-graphite-700 dark:bg-graphite-800/50">
            <h4 className="mb-3 text-sm font-bold text-graphite-700 dark:text-graphite-300">CCI 02</h4>
            <div className="space-y-3">
              <SlotFuncao label="BA-MC" value={form.guarnicoes.cci02.baMc} onChange={v => updateGuarnicao('cci02', 'baMc', v)} />
              <SlotFuncao label="BA-CE" value={form.guarnicoes.cci02.baCe} onChange={v => updateGuarnicao('cci02', 'baCe', v)} />
              <SlotFuncao label="BA-2" value={form.guarnicoes.cci02.ba2} onChange={v => updateGuarnicao('cci02', 'ba2', v)} />
            </div>
          </div>
          {/* CCI 03 */}
          <div className="rounded-lg border border-graphite-200 bg-graphite-50/50 p-4 dark:border-graphite-700 dark:bg-graphite-800/50">
            <h4 className="mb-3 text-sm font-bold text-graphite-700 dark:text-graphite-300">CCI 03</h4>
            <div className="space-y-3">
              <SlotFuncao label="BA-MC" value={form.guarnicoes.cci03.baMc} onChange={v => updateGuarnicao('cci03', 'baMc', v)} />
              <SlotFuncao label="BA-2" value={form.guarnicoes.cci03.ba2_1} onChange={v => updateGuarnicao('cci03', 'ba2_1', v)} />
              <SlotFuncao label="BA-2" value={form.guarnicoes.cci03.ba2_2} onChange={v => updateGuarnicao('cci03', 'ba2_2', v)} />
            </div>
          </div>
          {/* CRS */}
          <div className="rounded-lg border border-graphite-200 bg-graphite-50/50 p-4 dark:border-graphite-700 dark:bg-graphite-800/50">
            <h4 className="mb-3 text-sm font-bold text-graphite-700 dark:text-graphite-300">CRS</h4>
            <div className="space-y-3">
              <SlotFuncao label="BA-MC" value={form.guarnicoes.crs.baMc} onChange={v => updateGuarnicao('crs', 'baMc', v)} />
              <SlotFuncao label="BA-LR" value={form.guarnicoes.crs.baLr} onChange={v => updateGuarnicao('crs', 'baLr', v)} />
              <SlotFuncao label="BA-RE" value={form.guarnicoes.crs.baRe1} onChange={v => updateGuarnicao('crs', 'baRe1', v)} />
              <SlotFuncao label="BA-RE" value={form.guarnicoes.crs.baRe2} onChange={v => updateGuarnicao('crs', 'baRe2', v)} />
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
                className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
                <option value="">Selecione</option>
                {FUNCOES_BDS_PTR.map(f => <option key={f} value={f}>{f}</option>)}
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
                className="flex-1 rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              <button type="button" onClick={() => setForm(f => ({ ...f, atestados: f.atestados.filter((_, j) => j !== i) }))}
                className="rounded-lg p-1.5 text-alert-red hover:bg-red-50 dark:hover:bg-red-900/20">
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

      {/* Trocas */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
          <Users className="mr-1 inline h-4 w-4" /> Trocas
        </legend>
        <div className="space-y-4">
          {form.trocas.map((t, i) => (
            <div key={i} className="rounded-lg border border-graphite-200 bg-graphite-50/50 p-4 dark:border-graphite-700 dark:bg-graphite-800/50">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-graphite-500">Troca {i + 1}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, trocas: f.trocas.filter((_, j) => j !== i) }))}
                  className="rounded-lg p-1 text-alert-red hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-graphite-500">Função (saindo)</label>
                  <select value={t.funcaoSaindo} onChange={e => {
                    const next = [...form.trocas];
                    next[i] = { ...next[i], funcaoSaindo: e.target.value };
                    setForm(f => ({ ...f, trocas: next }));
                  }}
                    className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
                    <option value="">Selecione</option>
                    {FUNCOES_BDS_PTR.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-graphite-500">Nome (saindo)</label>
                  <SearchSelect value={t.nomeSaindo} onChange={v => {
                    const next = [...form.trocas];
                    next[i] = { ...next[i], nomeSaindo: v };
                    setForm(f => ({ ...f, trocas: next }));
                  }} placeholder="Nome de guerra" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-graphite-500">Função (entrando)</label>
                  <select value={t.funcaoEntrando} onChange={e => {
                    const next = [...form.trocas];
                    next[i] = { ...next[i], funcaoEntrando: e.target.value };
                    setForm(f => ({ ...f, trocas: next }));
                  }}
                    className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
                    <option value="">Selecione</option>
                    {FUNCOES_BDS_PTR.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-graphite-500">Nome (entrando)</label>
                  <SearchSelect value={t.nomeEntrando} onChange={v => {
                    const next = [...form.trocas];
                    next[i] = { ...next[i], nomeEntrando: v };
                    setForm(f => ({ ...f, trocas: next }));
                  }} placeholder="Nome de guerra" />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setForm(f => ({ ...f, trocas: [...f.trocas, { funcaoSaindo: '', nomeSaindo: '', funcaoEntrando: '', nomeEntrando: '' }] }))}
            className="flex items-center gap-1 text-sm text-aviation-600 hover:text-aviation-700 dark:text-aviation-400">
            <Plus className="h-4 w-4" /> Adicionar troca
          </button>
        </div>
      </fieldset>

      {/* Escala de Rádio */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
          <Radio className="mr-1 inline h-4 w-4" /> Escala de Rádio
        </legend>
        <div className="space-y-4">
          {form.radio.map((r, i) => (
            <div key={i} className="rounded-lg border border-graphite-200 bg-graphite-50/50 p-4 dark:border-graphite-700 dark:bg-graphite-800/50">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-graphite-500">Rádio {i + 1}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, radio: f.radio.filter((_, j) => j !== i) }))}
                  className="rounded-lg p-1 text-alert-red hover:bg-red-50 dark:hover:bg-red-900/20">
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
                    className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
                    <option value="">Selecione</option>
                    {FUNCOES_BDS_PTR.map(f => <option key={f} value={f}>{f}</option>)}
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
                    className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-graphite-500">Fim</label>
                  <input type="time" value={r.horarioFim} onChange={e => {
                    const next = [...form.radio];
                    next[i] = { ...next[i], horarioFim: e.target.value };
                    setForm(f => ({ ...f, radio: next }));
                  }}
                    className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
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
      <div className="flex items-center justify-end gap-3 border-t border-graphite-200 pt-6 dark:border-graphite-700">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-graphite-300 bg-white px-4 py-2 text-sm font-medium text-graphite-700 transition-colors hover:bg-graphite-50 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200">
          Cancelar
        </button>
        <button type="submit"
          className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-aviation-700">
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
    <div className="rounded-xl border border-graphite-200 bg-white p-4 shadow-sm dark:border-graphite-700 dark:bg-graphite-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-aviation-50 dark:bg-aviation-900/30">
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
            className="rounded-lg p-1.5 text-graphite-500 hover:bg-graphite-100 dark:hover:bg-graphite-700">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={onEdit} title="Editar"
            className="rounded-lg p-1.5 text-graphite-500 hover:bg-graphite-100 dark:hover:bg-graphite-700">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onClone} title="Clonar"
            className="rounded-lg p-1.5 text-graphite-500 hover:bg-graphite-100 dark:hover:bg-graphite-700">
            <Copy className="h-4 w-4" />
          </button>
          {isAdmin && (
            <button onClick={onDelete} title="Excluir"
              className="rounded-lg p-1.5 text-alert-red hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-1.5 text-graphite-500 hover:bg-graphite-100 dark:hover:bg-graphite-700">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-graphite-200 pt-4 dark:border-graphite-700">
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
  const isAdmin = user?.username === 'admin';
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
            className="rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
            <option value="">Todas as equipes</option>
            {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
          <p className="text-sm text-graphite-500 dark:text-graphite-400">
            {escalasFiltradas.length} escala(s)
          </p>
        </div>
        <button onClick={() => { setEditando(null); setMode('form'); }}
          className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-aviation-700">
          <Plus className="h-4 w-4" /> Nova Escala Diária
        </button>
      </div>

      {escalasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-graphite-700 dark:bg-graphite-900">
          <Calendar className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhuma escala encontrada</h3>
          <p className="text-sm text-graphite-500">Clique em "Nova Escala Diária" para criar a primeira.</p>
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
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-graphite-800">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500">Tem certeza que deseja excluir esta escala?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-graphite-300 bg-white px-4 py-2 text-sm font-medium text-graphite-700 hover:bg-graphite-50 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="rounded-lg bg-alert-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
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
            className="flex items-center gap-1 rounded-lg bg-aviation-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-aviation-700">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button onClick={onBack}
            className="rounded-lg border border-graphite-300 bg-white px-3 py-1.5 text-sm text-graphite-700 hover:bg-graphite-50 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200">
            Fechar
          </button>
        </div>
      </div>
      <div id="print-area" className="rounded-xl border border-graphite-200 bg-white p-4 shadow-sm dark:border-graphite-700 dark:bg-graphite-900 print:border-none print:shadow-none">
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
            <div className="rounded-lg bg-graphite-50 p-3 dark:bg-graphite-800">
              <p className="mb-1 text-xs font-bold text-graphite-500">CCI 02</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes.cci02.baMc || '-'}</p>
              <p className="text-sm">BA-CE: {escala.guarnicoes.cci02.baCe || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes.cci02.ba2 || '-'}</p>
            </div>
            <div className="rounded-lg bg-graphite-50 p-3 dark:bg-graphite-800">
              <p className="mb-1 text-xs font-bold text-graphite-500">CCI 03</p>
              <p className="text-sm">BA-MC: {escala.guarnicoes.cci03.baMc || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes.cci03.ba2_1 || '-'}</p>
              <p className="text-sm">BA-2: {escala.guarnicoes.cci03.ba2_2 || '-'}</p>
            </div>
            <div className="rounded-lg bg-graphite-50 p-3 dark:bg-graphite-800">
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