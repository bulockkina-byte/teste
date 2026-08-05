import { useState, useEffect, useMemo } from 'react';
import { FileText, Printer, Lock } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useContextoOperacional } from '../../hooks/useContextoOperacional';
import { listarPTRBs } from '../../services/ptrbService';
import { listarPTRBACompletos } from '../../services/ptrbaCompletoService';
import { converterCompletoParaPTRBs } from './PTRBA';
import type { PTRB } from '../../types/ptrb';
import { EQUIPES } from '../../types/ptrb';

const EQUIPES_FILTRO = EQUIPES.filter(eq => eq !== 'Ferista');
const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function calcHoras(inicio: string, termino: string): number {
  if (!inicio || !termino) return 0;
  const numsI = inicio.trim().match(/\d+/g);
  const numsT = termino.trim().match(/\d+/g);
  if (!numsI || !numsT) return 0;
  const h1 = Number(numsI[0]), m1 = Number(numsI[1] ?? 0);
  const h2 = Number(numsT[0]), m2 = Number(numsT[1] ?? 0);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
  let diff = h2 * 60 + m2 - (h1 * 60 + m1);
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

function parseDuracao(d: string): number {
  if (!d) return 0;
  const nums = d.trim().match(/\d+/g);
  if (!nums) return 0;
  const h = Number(nums[0]), m = Number(nums[1] ?? 0);
  if (isNaN(h) || isNaN(m)) return 0;
  return h + m / 60;
}

function horasDe(p: PTRB): number {
  return p.horas || calcHoras(p.horaInicio, p.horaTermino) || parseDuracao(p.duracao);
}

function horasStr(h: number): string {
  const minTotal = Math.round(h * 60);
  const horas = Math.floor(minTotal / 60);
  const min = minTotal % 60;
  if (min === 0) return `${horas}h`;
  return `${horas}h${min.toString().padStart(2, '0')}min`;
}

const inputClass = 'rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated';

export function PTRBARegistros() {
  const { canVisualizarRelatorios, loadingContexto } = useContextoOperacional();
  const [ptrbs, setPtrbs] = useState<PTRB[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [filtroEquipe, setFiltroEquipe] = useState('');
  const ANOS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  useEffect(() => {
    if (loadingContexto) return;
    if (!canVisualizarRelatorios) {
      setLoading(false);
      return;
    }
    Promise.all([listarPTRBs(), listarPTRBACompletos()])
      .then(([p, c]) => {
        const completos = (c || []).flatMap(converterCompletoParaPTRBs);
        setPtrbs([...p, ...completos]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canVisualizarRelatorios, loadingContexto]);

  useEffect(() => {
    if (loadingContexto || !canVisualizarRelatorios) return;
    const onFocus = () => {
      Promise.all([listarPTRBs(), listarPTRBACompletos()])
        .then(([p, c]) => {
          const completos = (c || []).flatMap(converterCompletoParaPTRBs);
          setPtrbs([...p, ...completos]);
        })
        .catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [canVisualizarRelatorios, loadingContexto]);

  const filtradas = useMemo(() => {
    let lista = ptrbs;
    if (filtroEquipe) lista = lista.filter(p => p.equipe?.trim() === filtroEquipe);
    if (filtroMes) {
      lista = lista.filter(p => {
        const d = new Date(p.data + 'T12:00:00');
        return (d.getMonth() + 1).toString() === filtroMes;
      });
    }
    if (filtroAno) lista = lista.filter(p => p.data?.startsWith(filtroAno));
    return lista.sort((a, b) => new Date(a.data || '').getTime() - new Date(b.data || '').getTime());
  }, [ptrbs, filtroMes, filtroAno, filtroEquipe]);

  const totalHoras = useMemo(() => filtradas.reduce((s, p) => s + horasDe(p), 0), [filtradas]);

  if (loading || loadingContexto) {
    return <PageContainer><div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" /></div></PageContainer>;
  }

  if (!canVisualizarRelatorios) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <Lock className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Acesso restrito</h3>
          <p className="text-sm text-graphite-400 dark:text-graphite-500">A tela de relatórios está disponível apenas para GS e administradores do sistema.</p>
        </div>
      </PageContainer>
    );
  }

  const periodoLabel = `${filtroMes ? MESES[Number(filtroMes)] + ' de ' : ''}${filtroAno || 'todos os anos'}${filtroEquipe ? ' · Equipe ' + filtroEquipe : ''}`;

  return (
    <PageContainer>
      <div className="print-hidden">
        <PageTitle icon={FileText} title="PTR-BA Registros" subtitle="Lista de todos os PTR-BAs por ordem de data" />
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-graphite-200/60 bg-white/70 p-3 backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
          <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className={inputClass}>
            <option value="">Todos os anos</option>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={inputClass}>
            <option value="">Todos os meses</option>
            {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)} className={inputClass}>
            <option value="">Todas as equipes</option>
            {EQUIPES_FILTRO.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
          <span className="text-sm text-graphite-500 dark:text-graphite-400">
            {filtradas.length} registro(s) · {horasStr(totalHoras)} de atividade
          </span>
          <button onClick={() => window.print()}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 active:scale-[0.98]">
            <Printer className="h-4 w-4" /> Imprimir Relatório
          </button>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <FileText className="mb-4 h-12 w-12 text-graphite-300" />
          <h3 className="text-lg font-semibold text-graphite-700">Nenhum PTR-BA encontrado</h3>
          <p className="text-sm text-graphite-400">Nenhum registro com os filtros atuais.</p>
        </div>
      ) : (
        <div id="print-area" className="rounded-2xl border border-graphite-200/60 bg-white/80 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <div className="hidden print:block border-b border-graphite-200 px-6 py-4 dark:border-border-dark">
            <p className="text-lg font-bold">Relatório PTR-BA — Registros por Ordem de Data</p>
            <p className="text-sm text-graphite-500">Período: {periodoLabel} · {filtradas.length} registro(s) · Total {horasStr(totalHoras)} · Gerado em {new Date().toLocaleString('pt-BR')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-graphite-200 bg-graphite-50 dark:border-border-dark dark:bg-surface-hover">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Nº</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Data</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Equipe</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Turno</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Horário</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Duração</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Assunto Ministrado</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Instrutor</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Participantes</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p, i) => (
                  <tr key={p.id} className="border-b border-graphite-100 dark:border-border-dark">
                    <td className="px-4 py-3 text-graphite-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-graphite-900 dark:text-graphite-100">{formatDate(p.data)}</td>
                    <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{p.equipe}</td>
                    <td className="px-4 py-3 text-xs text-graphite-500 dark:text-graphite-400">{p.turno || '—'}</td>
                    <td className="px-4 py-3 text-xs text-graphite-600 dark:text-graphite-400">{p.horaInicio ? `${p.horaInicio} às ${p.horaTermino}` : '—'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-700 dark:text-emerald-400">{horasStr(horasDe(p))}</td>
                    <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{p.assuntoMinistrado || '—'}</td>
                    <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{p.instrutor || '—'}</td>
                    <td className="px-4 py-3 text-center text-graphite-600 dark:text-graphite-400">{p.participantes?.length || 0}</td>
                  </tr>
                ))}
                <tr className="bg-graphite-50/70 dark:bg-surface-hover">
                  <td colSpan={5} className="px-4 py-3 text-right font-bold text-graphite-700 dark:text-graphite-200">TOTAL</td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-700 dark:text-emerald-400">{horasStr(totalHoras)}</td>
                  <td colSpan={2} className="px-4 py-3" />
                  <td className="px-4 py-3 text-center font-bold text-graphite-700 dark:text-graphite-200">{filtradas.reduce((s, p) => s + (p.participantes?.length || 0), 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default PTRBARegistros;
