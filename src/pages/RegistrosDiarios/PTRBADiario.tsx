import { useState, useEffect } from 'react';
import {
  FileText, Plus, Trash2, Save, Eye, Pencil, Copy, Printer,
  ChevronDown, ChevronUp, Image,
} from 'lucide-react';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarPTRBs, criarPTRB, atualizarPTRB, excluirPTRB } from '../../services/ptrbService';
import { listarBombeiros } from '../../services/bombeiroService';
import { CARGO_OPTIONS } from '../../types/bombeiro';
import type { PTRB, PTRBParticipante } from '../../types/ptrb';
import { EQUIPES, SITUACOES, ASSUNTOS } from '../../types/ptrb';

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function calcDuracao(inicio: string, termino: string): string {
  if (!inicio || !termino) return '';
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = termino.split(':').map(Number);
  let inicioMin = h1 * 60 + m1;
  let terminoMin = h2 * 60 + m2;
  if (terminoMin <= inicioMin) terminoMin += 24 * 60;
  const diff = terminoMin - inicioMin;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function autoTurno(equipe: string) {
  return equipe === 'Alfa' || equipe === 'Charlie' ? 'Diurno' : 'Noturno';
}

const FUNCAO_OPTIONS = CARGO_OPTIONS.map(c => c.value);

function emptyPTRB(): Omit<PTRB, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  return {
    data: new Date().toISOString().split('T')[0],
    horaInicio: '07:00',
    horaTermino: '19:00',
    duracao: '12:00',
    equipe: 'Alfa',
    turno: 'Diurno',
    participantes: [],
    observacoes: '',
    instrutor: '',
    assuntoMinistrado: '',
    descricao: '',
    informacoesComplementares: '',
    fotos: ['', '', ''],
  };
}

// ─── FORM ────────────────────────────────────────────────
function PTRBAForm({
  ptrb,
  onSave,
  onCancel,
}: {
  ptrb?: PTRB;
  onSave: (data: Omit<PTRB, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(emptyPTRB());

  useEffect(() => {
    if (ptrb) {
      setForm({
        data: ptrb.data,
        horaInicio: ptrb.horaInicio,
        horaTermino: ptrb.horaTermino,
        duracao: ptrb.duracao,
        equipe: ptrb.equipe,
        turno: ptrb.turno,
        participantes: ptrb.participantes,
        observacoes: ptrb.observacoes,
        instrutor: ptrb.instrutor,
        assuntoMinistrado: ptrb.assuntoMinistrado,
        descricao: ptrb.descricao,
        informacoesComplementares: ptrb.informacoesComplementares,
        fotos: ptrb.fotos.length ? ptrb.fotos : ['', '', ''],
      });
    }
  }, [ptrb]);

  function updateEquipe(equipe: string) {
    setForm(f => ({ ...f, equipe, turno: autoTurno(equipe) }));
  }

  function updateHoraInicio(val: string) {
    setForm(f => ({ ...f, horaInicio: val, duracao: calcDuracao(val, f.horaTermino) }));
  }

  function updateHoraTermino(val: string) {
    setForm(f => ({ ...f, horaTermino: val, duracao: calcDuracao(f.horaInicio, val) }));
  }

  function updateParticipante(idx: number, field: keyof PTRBParticipante, value: string) {
    setForm(f => {
      const next = [...f.participantes];
      next[idx] = { ...next[idx], [field]: value };

      const instrutorIdx = next.findIndex(p => p.situacao === 'INSTR');
      const instrutor = instrutorIdx >= 0 ? next[instrutorIdx].nomeCompleto : '';

      return { ...f, participantes: next, instrutor };
    });
  }

  function addParticipante() {
    setForm(f => ({
      ...f,
      participantes: [...f.participantes, { funcao: '', nomeCompleto: '', situacao: 'P' }],
    }));
  }

  function removeParticipante(idx: number) {
    setForm(f => {
      const next = f.participantes.filter((_, i) => i !== idx);
      const instrutorIdx = next.findIndex(p => p.situacao === 'INSTR');
      const instrutor = instrutorIdx >= 0 ? next[instrutorIdx].nomeCompleto : '';
      return { ...f, participantes: next, instrutor };
    });
  }

  function handleFotoUpload(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => {
        const fotos = [...f.fotos];
        fotos[idx] = reader.result as string;
        return { ...f, fotos };
      });
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Cabeçalho */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Data</label>
          <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Hora Início</label>
          <input type="time" value={form.horaInicio} onChange={e => updateHoraInicio(e.target.value)}
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Hora Término</label>
          <input type="time" value={form.horaTermino} onChange={e => updateHoraTermino(e.target.value)}
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Duração</label>
          <input value={form.duracao} disabled
            className="w-full rounded-xl border border-graphite-200/60 bg-graphite-100/50 px-3 py-2.5 text-sm text-graphite-400 dark:border-border-dark dark:bg-surface-card/50 dark:text-graphite-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Equipe</label>
          <select value={form.equipe} onChange={e => updateEquipe(e.target.value)}
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated">
            {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>
      </div>

      <div className="w-48">
        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Turno</label>
        <input value={form.turno} disabled
          className="w-full rounded-xl border border-graphite-200/60 bg-graphite-100/50 px-3 py-2.5 text-sm text-graphite-400 dark:border-border-dark dark:bg-surface-card/50 dark:text-graphite-500" />
      </div>

      {/* Participantes */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
          <Plus className="mr-1 inline h-4 w-4" /> Participantes
        </legend>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 dark:border-border-dark">
                <th className="px-3 py-2 text-left text-xs font-medium text-graphite-500 dark:text-graphite-400">Função</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-graphite-500 dark:text-graphite-400">Nome Completo</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-graphite-500 dark:text-graphite-400">Situação</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.participantes.map((p, i) => (
                <tr key={i} className="border-b border-graphite-100 dark:border-border-dark">
                  <td className="px-3 py-2">
                    <select value={p.funcao} onChange={e => updateParticipante(i, 'funcao', e.target.value)}
                      className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated">
                      <option value="">Selecione</option>
                      {FUNCAO_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 min-w-56">
                    <SearchSelect
                      value={p.nomeCompleto}
                      onChange={v => updateParticipante(i, 'nomeCompleto', v)}
                      placeholder="Selecione o nome"
                      cargo={p.funcao || undefined}
                      valueField="nomeCompleto"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select value={p.situacao} onChange={e => updateParticipante(i, 'situacao', e.target.value)}
                      className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated">
                      {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => removeParticipante(i)}
                      className="rounded-xl p-1.5 text-alert-red transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addParticipante}
          className="mt-3 flex items-center gap-1 text-sm text-aviation-600 hover:text-aviation-700 dark:text-aviation-400">
          <Plus className="h-4 w-4" /> Adicionar participante
        </button>
      </fieldset>

      {/* Observações */}
      <div>
        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Observações</label>
        <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3}
          className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated" />
      </div>

      {/* Instrutor */}
      <div className="w-80">
        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Instrutor</label>
        <input value={form.instrutor} readOnly
          className="w-full rounded-xl border border-graphite-200/60 bg-graphite-100/50 px-3 py-2.5 text-sm text-graphite-400 dark:border-border-dark dark:bg-surface-card/50 dark:text-graphite-500" />
      </div>

      {/* Assunto Ministrado */}
      <div>
        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Assunto Ministrado</label>
        <select value={form.assuntoMinistrado} onChange={e => setForm(f => ({ ...f, assuntoMinistrado: e.target.value }))}
          className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated">
          <option value="">Selecione</option>
          {ASSUNTOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Descrição */}
      <div>
        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Descrição</label>
        <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={6}
          className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated" />
      </div>

      {/* Informações Complementares */}
      <div>
        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Informações Complementares</label>
        <textarea value={form.informacoesComplementares} onChange={e => setForm(f => ({ ...f, informacoesComplementares: e.target.value }))} rows={6}
          className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated" />
      </div>

      {/* Fotos */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
          <Image className="mr-1 inline h-4 w-4" /> Fotos
        </legend>
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(idx => (
            <div key={idx}
              className="flex aspect-video cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-graphite-300/60 bg-graphite-100/30 backdrop-blur-sm transition-all duration-200 hover:border-aviation-400/50 dark:border-border-dark dark:bg-surface-card/30"
              onClick={() => document.getElementById(`foto-${idx}`)?.click()}>
              {form.fotos[idx] ? (
                <img src={form.fotos[idx]} alt={`Foto ${idx + 1}`} className="h-full w-full rounded-lg object-cover" />
              ) : (
                <div className="text-center">
                  <Image className="mx-auto h-8 w-8 text-graphite-400" />
                  <p className="mt-1 text-xs text-graphite-400">Clique para adicionar</p>
                </div>
              )}
              <input id={`foto-${idx}`} type="file" accept="image/*" className="hidden" onChange={e => handleFotoUpload(idx, e)} />
            </div>
          ))}
        </div>
      </fieldset>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-graphite-200 pt-6 dark:border-border-dark">
        <button type="button" onClick={onCancel}
          className="rounded-xl border border-graphite-300/60 bg-white/80 px-4 py-2 text-sm font-medium text-graphite-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-graphite-50 hover:border-graphite-300 dark:border-border-dark dark:bg-surface-card/80 dark:text-graphite-200 dark:hover:bg-surface-hover/50">
          Cancelar
        </button>
        <button type="submit"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
          <Save className="h-4 w-4" />
          {ptrb ? 'Salvar Alterações' : 'Criar PTR-BA'}
        </button>
      </div>
    </form>
  );
}

// ─── LIST VIEW ──────────────────────────────────────────────
function PTRBCard({ ptrb, onView, onEdit, onDelete, onClone, canEdit }: {
  ptrb: PTRB;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClone: () => void;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-graphite-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-50 to-aviation-100 dark:from-aviation-900/30 dark:to-aviation-800/20">
            <FileText className="h-5 w-5 text-aviation-600 dark:text-aviation-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-graphite-900 dark:text-graphite-100">
              PTR-BA - {ptrb.equipe} - {formatDate(ptrb.data)}
            </p>
            <p className="text-xs text-graphite-500 dark:text-graphite-400">
              {ptrb.turno} · {ptrb.horaInicio} às {ptrb.horaTermino} ({ptrb.duracao}h)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onView} title="Visualizar"
            className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300">
            <Eye className="h-4 w-4" />
          </button>
          {canEdit && (
            <>
              <button onClick={onEdit} title="Editar"
                className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={onClone} title="Clonar"
                className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300">
                <Copy className="h-4 w-4" />
              </button>
              <button onClick={onDelete} title="Excluir"
                className="rounded-xl p-1.5 text-alert-red transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover dark:hover:text-graphite-300">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-graphite-200 pt-4 dark:border-border-dark">
          {ptrb.participantes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Participantes</p>
              <div className="mt-1 space-y-1">
                {ptrb.participantes.map((p, i) => (
                  <p key={i} className="text-sm">{p.funcao || '-'}: {p.nomeCompleto || '-'} ({p.situacao})</p>
                ))}
              </div>
            </div>
          )}
          {ptrb.observacoes && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Observações</p>
              <p className="text-sm dark:text-graphite-100">{ptrb.observacoes}</p>
            </div>
          )}
          {ptrb.instrutor && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Instrutor</p>
              <p className="text-sm dark:text-graphite-100">{ptrb.instrutor}</p>
            </div>
          )}
          {ptrb.assuntoMinistrado && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Assunto Ministrado</p>
              <p className="text-sm dark:text-graphite-100">{ptrb.assuntoMinistrado}</p>
            </div>
          )}
          {ptrb.descricao && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Descrição</p>
              <p className="text-sm whitespace-pre-wrap dark:text-graphite-100">{ptrb.descricao}</p>
            </div>
          )}
          {ptrb.informacoesComplementares && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Informações Complementares</p>
              <p className="text-sm whitespace-pre-wrap dark:text-graphite-100">{ptrb.informacoesComplementares}</p>
            </div>
          )}
          {ptrb.fotos.some(f => f) && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Fotos</p>
              <div className="mt-1 flex gap-2">
                {ptrb.fotos.filter(f => f).map((f, i) => (
                  <img key={i} src={f} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── VIEW MODE ──────────────────────────────────────────────
function ViewMode({ ptrb, onBack }: { ptrb: PTRB; onBack: () => void }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between print-hidden">
        <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
          PTR-BA - {ptrb.equipe} - {formatDate(ptrb.data)}
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
            <p className="text-xs text-graphite-400">Data</p>
            <p className="text-sm font-medium dark:text-graphite-100">{formatDate(ptrb.data)}</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Equipe</p>
            <p className="text-sm font-medium dark:text-graphite-100">{ptrb.equipe}</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Horário</p>
            <p className="text-sm font-medium dark:text-graphite-100">{ptrb.horaInicio} às {ptrb.horaTermino} ({ptrb.duracao}h)</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Turno</p>
            <p className="text-sm font-medium dark:text-graphite-100">{ptrb.turno}</p>
          </div>
        </div>

        {ptrb.participantes.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Participantes</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-graphite-200 dark:border-border-dark">
                  <th className="px-3 py-1.5 text-left text-xs text-graphite-500 dark:text-graphite-400">Função</th>
                  <th className="px-3 py-1.5 text-left text-xs text-graphite-500 dark:text-graphite-400">Nome</th>
                  <th className="px-3 py-1.5 text-left text-xs text-graphite-500 dark:text-graphite-400">Situação</th>
                </tr>
              </thead>
              <tbody>
                {ptrb.participantes.map((p, i) => (
                  <tr key={i} className="border-b border-graphite-100 dark:border-border-dark">
                    <td className="px-3 py-1.5 dark:text-graphite-100">{p.funcao || '-'}</td>
                    <td className="px-3 py-1.5 dark:text-graphite-100">{p.nomeCompleto || '-'}</td>
                    <td className="px-3 py-1.5 dark:text-graphite-100">{p.situacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ptrb.observacoes && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Observações</p>
            <p className="text-sm whitespace-pre-wrap dark:text-graphite-100">{ptrb.observacoes}</p>
          </div>
        )}

        {ptrb.instrutor && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Instrutor</p>
            <p className="text-sm dark:text-graphite-100">{ptrb.instrutor}</p>
          </div>
        )}

        {ptrb.assuntoMinistrado && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Assunto Ministrado</p>
            <p className="text-sm dark:text-graphite-100">{ptrb.assuntoMinistrado}</p>
          </div>
        )}

        {ptrb.descricao && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Descrição</p>
            <p className="text-sm whitespace-pre-wrap dark:text-graphite-100">{ptrb.descricao}</p>
          </div>
        )}

        {ptrb.informacoesComplementares && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Informações Complementares</p>
            <p className="text-sm whitespace-pre-wrap dark:text-graphite-100">{ptrb.informacoesComplementares}</p>
          </div>
        )}

        {ptrb.fotos.some(f => f) && (
          <div>
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Fotos</p>
            <div className="grid grid-cols-3 gap-4">
              {ptrb.fotos.filter(f => f).map((f, i) => (
                <img key={i} src={f} alt={`Foto ${i + 1}`} className="w-full rounded-lg object-cover" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────
async function getUserRole(username: string): Promise<'admin' | 'gerente' | 'chefe'> {
  if (username === 'admin' || username === 'admin_master') return 'admin';
  const users = JSON.parse(localStorage.getItem('sescinc-users') || '{}');
  const stored = users[username];
  if (stored?.role === 'admin_master' || stored?.role === 'admin') return 'admin';
  const bombeiros = await listarBombeiros();
  const b = bombeiros.find(
    x => x.nomeGuerra.toLowerCase() === username.toLowerCase() ||
         x.nomeCompleto.toLowerCase().includes(username.toLowerCase()),
  );
  if (b?.cargo === 'GS' || b?.equipe === 'Embaixador') return 'gerente';
  if (b?.cargo === 'BA-CE' || b?.cargo === 'BA-LR') return 'chefe';
  return 'chefe';
}

async function getUserEquipe(username: string): Promise<string> {
  const bombeiros = await listarBombeiros();
  const b = bombeiros.find(
    x => x.nomeGuerra.toLowerCase() === username.toLowerCase() ||
         x.nomeCompleto.toLowerCase().includes(username.toLowerCase()),
  );
  return b?.equipe || '';
}

export function PTRBADiario() {
  const { user } = useAuth();
  const username = user?.username || '';
  const [role, setRole] = useState<'admin' | 'gerente' | 'chefe'>('chefe');
  const [userEquipe, setUserEquipe] = useState('');
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const r = await getUserRole(username);
      if (cancelled) return;
      setRole(r);
      const eq = await getUserEquipe(username);
      if (!cancelled) setUserEquipe(eq);
    }
    load();
    return () => { cancelled = true; };
  }, [username]);
  const isAdmin = role === 'admin';
  const isGerente = role === 'gerente';
  const canFilterTeam = isAdmin || isGerente;
  const canEdit = isAdmin || role === 'chefe';
  const [ptrbs, setPtrbs] = useState<PTRB[]>([]);
  const [mode, setMode] = useState<'list' | 'form' | 'view'>('list');
  const [editando, setEditando] = useState<PTRB | null>(null);
  const [visualizando, setVisualizando] = useState<PTRB | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filtroEquipe, setFiltroEquipe] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const ANOS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const inputClass = 'rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated';

  const ptrbsFiltradas = ptrbs.filter(e => {
    if (filtroEquipe && e.equipe !== filtroEquipe) return false;
    if (filtroMes) {
      const d = new Date(e.data);
      if ((d.getMonth() + 1).toString() !== filtroMes) return false;
    }
    if (filtroAno && !e.data.startsWith(filtroAno)) return false;
    return true;
  });

  function carregar() {
    const todas = listarPTRBs();
    if (isAdmin || isGerente) {
      setPtrbs(todas);
    } else if (userEquipe) {
      setPtrbs(todas.filter(e => e.equipe === userEquipe));
    } else {
      setPtrbs(todas.filter(e => e.createdBy === username));
    }
  }

  useEffect(() => { carregar(); }, [isAdmin, isGerente, username, userEquipe]);

  function handleSave(data: Omit<PTRB, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) {
    let saved: PTRB | null;
    if (editando && editando.id) {
      saved = atualizarPTRB(editando.id, data);
    } else {
      saved = criarPTRB({ ...data, createdBy: username });
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

  function handleClone(e: PTRB) {
    setEditando({
      ...e,
      id: '',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
      data: new Date().toISOString().split('T')[0],
      observacoes: '',
      instrutor: '',
      assuntoMinistrado: '',
      descricao: '',
      informacoesComplementares: '',
      fotos: ['', '', ''],
    });
    setMode('form');
  }

  function handleDelete(id: string) {
    excluirPTRB(id);
    setConfirmDelete(null);
    carregar();
  }

  if (mode === 'form') {
    return (
      <PageContainer>
        <PageTitle icon={FileText} title={`PTR-BA - ${editando?.id ? 'Editar' : editando && !editando.id ? 'Clonar' : 'Novo'} Registro`} />
        <PTRBAForm ptrb={editando || undefined} onSave={handleSave} onCancel={() => { setMode('list'); setEditando(null); }} />
      </PageContainer>
    );
  }

  if (mode === 'view' && visualizando) {
    return (
      <PageContainer>
        <ViewMode ptrb={visualizando} onBack={() => setMode('list')} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageTitle icon={FileText} title="PTR-BA - Registro Diário" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className={inputClass}>
            <option value="">Todos os anos</option>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={inputClass}>
            <option value="">Todos os meses</option>
            {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          {canFilterTeam && (
            <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)} className={inputClass}>
              <option value="">Todas as equipes</option>
              {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          )}
          <p className="text-sm text-graphite-500 dark:text-graphite-400">
            {ptrbsFiltradas.length} registro(s)
          </p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditando(null); setMode('form'); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Novo PTR-BA
          </button>
        )}
      </div>

      {ptrbsFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
          <FileText className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum registro encontrado</h3>
          <p className="text-sm text-graphite-400">Clique em "Novo PTR-BA" para criar o primeiro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ptrbsFiltradas.map(e => (
            <PTRBCard
              key={e.id}
              ptrb={e}
              canEdit={canEdit}
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
            <p className="mb-6 text-sm text-graphite-500 dark:text-graphite-400">Tem certeza que deseja excluir este PTR-BA?</p>
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
    </PageContainer>
  );
}
