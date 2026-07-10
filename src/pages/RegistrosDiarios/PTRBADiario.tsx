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
            className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Hora Início</label>
          <input type="time" value={form.horaInicio} onChange={e => updateHoraInicio(e.target.value)}
            className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Hora Término</label>
          <input type="time" value={form.horaTermino} onChange={e => updateHoraTermino(e.target.value)}
            className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Duração</label>
          <input value={form.duracao} disabled
            className="w-full rounded-lg border border-graphite-200 bg-graphite-50 px-3 py-2 text-sm text-graphite-500 dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-400" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Equipe</label>
          <select value={form.equipe} onChange={e => updateEquipe(e.target.value)}
            className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
            {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>
      </div>

      <div className="w-48">
        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Turno</label>
        <input value={form.turno} disabled
          className="w-full rounded-lg border border-graphite-200 bg-graphite-50 px-3 py-2 text-sm text-graphite-500 dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-400" />
      </div>

      {/* Participantes */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
          <Plus className="mr-1 inline h-4 w-4" /> Participantes
        </legend>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 dark:border-graphite-700">
                <th className="px-3 py-2 text-left text-xs font-medium text-graphite-500">Função</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-graphite-500">Nome Completo</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-graphite-500">Situação</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {form.participantes.map((p, i) => (
                <tr key={i} className="border-b border-graphite-100 dark:border-graphite-800">
                  <td className="px-3 py-2">
                    <select value={p.funcao} onChange={e => updateParticipante(i, 'funcao', e.target.value)}
                      className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
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
                      className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
                      {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => removeParticipante(i)}
                      className="rounded-lg p-1.5 text-alert-red hover:bg-red-50 dark:hover:bg-red-900/20">
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
          className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
      </div>

      {/* Instrutor */}
      <div className="w-80">
        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Instrutor</label>
        <input value={form.instrutor} readOnly
          className="w-full rounded-lg border border-graphite-200 bg-graphite-50 px-3 py-2 text-sm text-graphite-500 dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-400" />
      </div>

      {/* Assunto Ministrado */}
      <div>
        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Assunto Ministrado</label>
        <select value={form.assuntoMinistrado} onChange={e => setForm(f => ({ ...f, assuntoMinistrado: e.target.value }))}
          className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
          <option value="">Selecione</option>
          {ASSUNTOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Descrição */}
      <div>
        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Descrição</label>
        <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={6}
          className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
      </div>

      {/* Informações Complementares */}
      <div>
        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Informações Complementares</label>
        <textarea value={form.informacoesComplementares} onChange={e => setForm(f => ({ ...f, informacoesComplementares: e.target.value }))} rows={6}
          className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
      </div>

      {/* Fotos */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
          <Image className="mr-1 inline h-4 w-4" /> Fotos
        </legend>
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(idx => (
            <div key={idx}
              className="flex aspect-video cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-graphite-300 bg-graphite-50 transition-colors hover:border-aviation-400 dark:border-graphite-600 dark:bg-graphite-800/50"
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
      <div className="flex items-center justify-end gap-3 border-t border-graphite-200 pt-6 dark:border-graphite-700">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-graphite-300 bg-white px-4 py-2 text-sm font-medium text-graphite-700 transition-colors hover:bg-graphite-50 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200">
          Cancelar
        </button>
        <button type="submit"
          className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-aviation-700">
          <Save className="h-4 w-4" />
          {ptrb ? 'Salvar Alterações' : 'Criar PTR-BA'}
        </button>
      </div>
    </form>
  );
}

// ─── LIST VIEW ──────────────────────────────────────────────
function PTRBCard({ ptrb, onView, onEdit, onDelete, onClone, isAdmin }: {
  ptrb: PTRB;
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
            <FileText className="h-5 w-5 text-aviation-600 dark:text-aviation-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-graphite-900 dark:text-graphite-100">
              PTR-BA - {ptrb.equipe} - {formatDate(ptrb.data)}
            </p>
            <p className="text-xs text-graphite-500">
              {ptrb.turno} · {ptrb.horaInicio} às {ptrb.horaTermino} ({ptrb.duracao}h)
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
              <p className="text-sm">{ptrb.observacoes}</p>
            </div>
          )}
          {ptrb.instrutor && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Instrutor</p>
              <p className="text-sm">{ptrb.instrutor}</p>
            </div>
          )}
          {ptrb.assuntoMinistrado && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Assunto Ministrado</p>
              <p className="text-sm">{ptrb.assuntoMinistrado}</p>
            </div>
          )}
          {ptrb.descricao && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Descrição</p>
              <p className="text-sm whitespace-pre-wrap">{ptrb.descricao}</p>
            </div>
          )}
          {ptrb.informacoesComplementares && (
            <div>
              <p className="text-xs font-semibold text-aviation-600 dark:text-aviation-400">Informações Complementares</p>
              <p className="text-sm whitespace-pre-wrap">{ptrb.informacoesComplementares}</p>
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
            <p className="text-xs text-graphite-400">Data</p>
            <p className="text-sm font-medium">{formatDate(ptrb.data)}</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Equipe</p>
            <p className="text-sm font-medium">{ptrb.equipe}</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Horário</p>
            <p className="text-sm font-medium">{ptrb.horaInicio} às {ptrb.horaTermino} ({ptrb.duracao}h)</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Turno</p>
            <p className="text-sm font-medium">{ptrb.turno}</p>
          </div>
        </div>

        {ptrb.participantes.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Participantes</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-graphite-200 dark:border-graphite-700">
                  <th className="px-3 py-1.5 text-left text-xs text-graphite-500">Função</th>
                  <th className="px-3 py-1.5 text-left text-xs text-graphite-500">Nome</th>
                  <th className="px-3 py-1.5 text-left text-xs text-graphite-500">Situação</th>
                </tr>
              </thead>
              <tbody>
                {ptrb.participantes.map((p, i) => (
                  <tr key={i} className="border-b border-graphite-100 dark:border-graphite-800">
                    <td className="px-3 py-1.5">{p.funcao || '-'}</td>
                    <td className="px-3 py-1.5">{p.nomeCompleto || '-'}</td>
                    <td className="px-3 py-1.5">{p.situacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ptrb.observacoes && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Observações</p>
            <p className="text-sm whitespace-pre-wrap">{ptrb.observacoes}</p>
          </div>
        )}

        {ptrb.instrutor && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Instrutor</p>
            <p className="text-sm">{ptrb.instrutor}</p>
          </div>
        )}

        {ptrb.assuntoMinistrado && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Assunto Ministrado</p>
            <p className="text-sm">{ptrb.assuntoMinistrado}</p>
          </div>
        )}

        {ptrb.descricao && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Descrição</p>
            <p className="text-sm whitespace-pre-wrap">{ptrb.descricao}</p>
          </div>
        )}

        {ptrb.informacoesComplementares && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Informações Complementares</p>
            <p className="text-sm whitespace-pre-wrap">{ptrb.informacoesComplementares}</p>
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
export function PTRBADiario() {
  const { user } = useAuth();
  const isAdmin = user?.username === 'admin';
  const username = user?.username || '';
  const [ptrbs, setPtrbs] = useState<PTRB[]>([]);
  const [mode, setMode] = useState<'list' | 'form' | 'view'>('list');
  const [editando, setEditando] = useState<PTRB | null>(null);
  const [visualizando, setVisualizando] = useState<PTRB | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filtroEquipe, setFiltroEquipe] = useState('');

  const ptrbsFiltradas = filtroEquipe ? ptrbs.filter(e => e.equipe === filtroEquipe) : ptrbs;

  function carregar() {
    const todas = listarPTRBs();
    if (isAdmin) {
      setPtrbs(todas);
    } else {
      setPtrbs(todas.filter(e => e.createdBy === username));
    }
  }

  useEffect(() => { carregar(); }, [isAdmin, username]);

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
          <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)}
            className="rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
            <option value="">Todas as equipes</option>
            {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
          <p className="text-sm text-graphite-500 dark:text-graphite-400">
            {ptrbsFiltradas.length} registro(s)
          </p>
        </div>
        <button onClick={() => { setEditando(null); setMode('form'); }}
          className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-aviation-700">
          <Plus className="h-4 w-4" /> Novo PTR-BA
        </button>
      </div>

      {ptrbsFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-graphite-700 dark:bg-graphite-900">
          <FileText className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum registro encontrado</h3>
          <p className="text-sm text-graphite-500">Clique em "Novo PTR-BA" para criar o primeiro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ptrbsFiltradas.map(e => (
            <PTRBCard
              key={e.id}
              ptrb={e}
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
            <p className="mb-6 text-sm text-graphite-500">Tem certeza que deseja excluir este PTR-BA?</p>
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
    </PageContainer>
  );
}
