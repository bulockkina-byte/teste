import { useState, useEffect, useMemo } from 'react';
import {
  Award, Plus, Search, ChevronDown, ChevronUp, Trash2, X, Eye, User,
  Calendar, Building2, Shield, Clock,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarBombeiros } from '../../services/bombeiroService';
import { NR_OPTIONS } from '../../types/certificacao';
import {
  listarCertificacoes, criarCertificacao, excluirCertificacao,
} from '../../services/certificacaoService';
import type { CertificacaoNR } from '../../types/certificacao';

const NR_COLORS: Record<string, string> = {
  'NR-1':  'from-slate-500 to-slate-600',
  'NR-5':  'from-blue-500 to-blue-600',
  'NR-6':  'from-emerald-500 to-emerald-600',
  'NR-10': 'from-yellow-500 to-amber-600',
  'NR-12': 'from-red-500 to-red-600',
  'NR-18': 'from-orange-500 to-orange-600',
  'NR-20': 'from-rose-500 to-rose-600',
  'NR-23': 'from-red-600 to-red-700',
  'NR-26': 'from-teal-500 to-teal-600',
  'NR-33': 'from-indigo-500 to-indigo-600',
  'NR-34': 'from-purple-500 to-purple-600',
  'NR-35': 'from-cyan-500 to-cyan-600',
};

function getStatusValidade(dataValidade: string): { label: string; color: string } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade + 'T00:00:00');
  const dias = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { label: 'Vencida', color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' };
  if (dias <= 90) return { label: 'Próximo ao vencimento', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' };
  return { label: 'Válida', color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' };
}

/* ───────── Modal NR ───────── */

function NRModal({ nr, onClose }: { nr: CertificacaoNR; onClose: () => void }) {
  const info = NR_OPTIONS.find(n => n.numero === nr.nrNumero);
  const gradient = NR_COLORS[nr.nrNumero] || 'from-gray-500 to-gray-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className={`overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} shadow-2xl`}>
          <div className="relative px-8 pt-8 pb-6 text-center text-white">
            <button onClick={onClose} className="absolute right-3 top-3 rounded-xl bg-white/20 p-1.5 backdrop-blur-sm transition hover:bg-white/30">
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-black tracking-tight">{nr.nrNumero}</h2>
            <p className="mt-1 text-sm font-medium text-white/80">{info?.nome || nr.nrNome}</p>
          </div>
          <div className="bg-white px-8 py-6 dark:bg-graphite-800">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 shrink-0 text-graphite-400" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite-400">Colaborador</p>
                  <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{nr.funcionarioNome}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 shrink-0 text-graphite-400" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite-400">Empresa</p>
                  <p className="text-sm font-medium text-graphite-700 dark:text-graphite-300">{nr.empresa || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 shrink-0 text-graphite-400" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite-400">Validade</p>
                  <p className="text-sm font-medium text-graphite-700 dark:text-graphite-300">
                    {new Date(nr.dataValidade + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
            {nr.foto && (
              <div className="mt-4 rounded-xl border border-graphite-200 dark:border-graphite-700">
                <img src={nr.foto} className="w-full rounded-xl object-contain max-h-64" alt={nr.nrNumero} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Formulário NR ───────── */

function NRFormInline({
  funcionarioId,
  funcionarioNome,
  onSave,
  onCancel,
}: {
  funcionarioId: string;
  funcionarioNome: string;
  onSave: (data: Omit<CertificacaoNR, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const hoje = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    nrNumero: '',
    nrNome: '',
    dataEmissao: hoje,
    dataValidade: '',
    empresa: '',
    foto: '',
  });

  const input = 'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100';
  const label = 'block mb-1 text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';

  function handleNR(numero: string) {
    const nr = NR_OPTIONS.find(n => n.numero === numero);
    setForm(f => ({ ...f, nrNumero: numero, nrNome: nr?.nome || '' }));
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, foto: reader.result as string }));
    reader.readAsDataURL(file);
  }

  return (
    <tr className="bg-aviation-50/50 dark:bg-aviation-900/10">
      <td className="px-4 py-4" colSpan={4}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={label}>NR *</label>
            <select value={form.nrNumero} onChange={e => handleNR(e.target.value)} className={input}>
              <option value="">Selecione</option>
              {NR_OPTIONS.map(nr => <option key={nr.numero} value={nr.numero}>{nr.numero} — {nr.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Data de Emissão</label>
            <input type="date" value={form.dataEmissao} onChange={e => setForm(f => ({ ...f, dataEmissao: e.target.value }))} className={input} />
          </div>
          <div>
            <label className={label}>Data de Validade *</label>
            <input type="date" value={form.dataValidade} onChange={e => setForm(f => ({ ...f, dataValidade: e.target.value }))} className={input} />
          </div>
          <div>
            <label className={label}>Empresa</label>
            <input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} className={input} placeholder="Empresa certificadora" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className={label}>Foto do Certificado</label>
            <div className="flex items-center gap-3">
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-graphite-300 text-graphite-400 transition-colors hover:border-aviation-400 hover:text-aviation-500">
                {form.foto ? <img src={form.foto} className="h-full w-full rounded-xl object-cover" /> : <Plus className="h-6 w-6" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
              {form.foto && (
                <button onClick={() => setForm(f => ({ ...f, foto: '' }))} className="text-xs text-alert-red hover:underline">Remover</button>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-graphite-300 bg-white px-3 py-1.5 text-xs font-medium text-graphite-700 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200">
            Cancelar
          </button>
          <button
            onClick={() => onSave({
              funcionarioId, funcionarioNome,
              nrNumero: form.nrNumero, nrNome: form.nrNome,
              dataEmissao: form.dataEmissao, dataValidade: form.dataValidade,
              empresa: form.empresa, foto: form.foto,
            })}
            disabled={!form.nrNumero || !form.dataValidade}
            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-all hover:from-aviation-500 hover:to-aviation-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ───────── Card Funcionário ───────── */

function FuncionarioCard({
  funcionario,
  certificacoes,
  isAdmin,
  onAdd,
  onDelete,
  onViewNR,
}: {
  funcionario: { id: string; nomeCompleto: string; nomeGuerra: string; equipe: string; foto: string };
  certificacoes: CertificacaoNR[];
  isAdmin: boolean;
  onAdd: (funcId: string, funcNome: string) => void;
  onDelete: (certId: string) => void;
  onViewNR: (cert: CertificacaoNR) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-graphite-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-graphite-700 dark:bg-graphite-800">
      <button onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white shadow-md shadow-aviation-500/20">
          {funcionario.foto ? (
            <img src={funcionario.foto} className="h-full w-full rounded-xl object-cover" />
          ) : (
            funcionario.nomeGuerra?.charAt(0)?.toUpperCase() || funcionario.nomeCompleto.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-graphite-900 dark:text-graphite-100 truncate">{funcionario.nomeCompleto}</p>
          <p className="text-xs text-graphite-500 dark:text-graphite-400">
            {funcionario.nomeGuerra} · Equipe {funcionario.equipe}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-aviation-50 px-2.5 py-0.5 text-[10px] font-bold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
            {certificacoes.length} NR(s)
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-graphite-400" /> : <ChevronDown className="h-4 w-4 text-graphite-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-graphite-200 px-5 py-4 dark:border-graphite-700">
          {certificacoes.length === 0 ? (
            <p className="text-center text-sm text-graphite-400 py-4">Nenhuma NR cadastrada para este funcionário.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {certificacoes.map(cert => {
                const gradient = NR_COLORS[cert.nrNumero] || 'from-gray-500 to-gray-600';
                const status = getStatusValidade(cert.dataValidade);
                return (
                  <button
                    key={cert.id}
                    onClick={() => onViewNR(cert)}
                    className="group flex items-center gap-3 rounded-xl border border-graphite-200 bg-white p-3 text-left transition-all hover:border-aviation-300 hover:shadow-md dark:border-graphite-700 dark:bg-graphite-900/50 dark:hover:border-aviation-600"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-xs font-black text-white shadow-sm`}>
                      {cert.nrNumero.replace('NR-', '')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-graphite-900 dark:text-graphite-100">{cert.nrNumero}</p>
                      <p className="truncate text-[10px] text-graphite-500 dark:text-graphite-400">{cert.nrNome}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${status.color}`}>{status.label}</span>
                        <span className="text-[9px] text-graphite-400">
                          {new Date(cert.dataValidade + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <Eye className="h-3.5 w-3.5 shrink-0 text-graphite-300 transition-colors group-hover:text-aviation-500" />
                  </button>
                );
              })}
            </div>
          )}
          {isAdmin && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => onAdd(funcionario.id, funcionario.nomeCompleto)}
                className="flex items-center gap-1 rounded-lg border border-aviation-300 bg-aviation-50 px-3 py-1.5 text-xs font-medium text-aviation-700 transition-all hover:bg-aviation-100 dark:border-aviation-700 dark:bg-aviation-900/20 dark:text-aviation-300 dark:hover:bg-aviation-900/40"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar NR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── Página principal ───────── */

export function Certificacoes() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [certificacoes, setCertificacoes] = useState<CertificacaoNR[]>([]);
  const [termo, setTermo] = useState('');
  const [formOpen, setFormOpen] = useState<string | null>(null);
  const [funcNome, setFuncNome] = useState('');
  const [nrModal, setNrModal] = useState<CertificacaoNR | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const bombeiros = useMemo(() => listarBombeiros(), []);

  function carregar() { setCertificacoes(listarCertificacoes()); }
  useEffect(() => { carregar(); }, []);

  const filtrados = useMemo(() => {
    if (!termo) return bombeiros;
    const t = termo.toLowerCase();
    return bombeiros.filter(b =>
      b.nomeCompleto.toLowerCase().includes(t) ||
      b.nomeGuerra.toLowerCase().includes(t) ||
      b.equipe.toLowerCase().includes(t)
    );
  }, [bombeiros, termo]);

  function handleAdd(funcId: string, funcNome: string) {
    setFormOpen(funcId);
    setFuncNome(funcNome);
  }

  function handleSaveNR(data: Omit<CertificacaoNR, 'id' | 'createdAt' | 'updatedAt'>) {
    criarCertificacao(data);
    carregar();
    setFormOpen(null);
  }

  function handleDeleteNR(id: string) {
    excluirCertificacao(id);
    setConfirmDelete(null);
    carregar();
  }

  return (
    <PageContainer>
      <PageTitle icon={Award} title="Certificações" />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Pesquisar funcionário..."
            className="w-full rounded-xl border border-graphite-300 bg-white py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100"
          />
        </div>
        <p className="text-sm text-graphite-500 dark:text-graphite-400">
          {filtrados.length} funcionário(s) · {certificacoes.length} certificação(ões)
        </p>
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-graphite-700 dark:bg-graphite-900/30">
          <Award className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum funcionário encontrado</h3>
          <p className="text-sm text-graphite-400">Cadastre bombeiros primeiro para gerenciar certificações.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(b => {
            const certs = certificacoes.filter(c => c.funcionarioId === b.id);
            return (
              <div key={b.id}>
                <FuncionarioCard
                  funcionario={b}
                  certificacoes={certs}
                  isAdmin={isAdmin}
                  onAdd={handleAdd}
                  onDelete={(id) => setConfirmDelete(id)}
                  onViewNR={(cert) => setNrModal(cert)}
                />
                {formOpen === b.id && (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-aviation-200 bg-white shadow-lg dark:border-aviation-700 dark:bg-graphite-800">
                    <div className="flex items-center justify-between border-b border-graphite-200 px-4 py-3 dark:border-graphite-700">
                      <h4 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">
                        Adicionar NR — {funcNome}
                      </h4>
                      <button onClick={() => setFormOpen(null)} className="rounded-lg p-1 text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-700">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      <NRFormInline
                        funcionarioId={b.id}
                        funcionarioNome={b.nomeCompleto}
                        onSave={handleSaveNR}
                        onCancel={() => setFormOpen(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {nrModal && <NRModal nr={nrModal} onClose={() => setNrModal(null)} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-graphite-800">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500">Tem certeza que deseja excluir esta certificação?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200">Cancelar</button>
              <button onClick={() => handleDeleteNR(confirmDelete)}
                className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98]">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
