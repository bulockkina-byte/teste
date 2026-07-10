import { useState } from 'react';
import { Calendar, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listarEscalas } from '../../services/escalaService';
import type { EscalaDiaria } from '../../types/escala';

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

export function EscalaMensal() {
  const { user } = useAuth();
  const isAdmin = user?.username === 'admin';
  const username = user?.username || '';

  const todas = listarEscalas();
  const escalas = isAdmin ? todas : todas.filter(e => e.createdBy === username);

  const [visualizando, setVisualizando] = useState<EscalaDiaria | null>(null);

  if (visualizando) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between print-hidden">
          <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
            Escala - {visualizando.equipe} - {formatDate(visualizando.dataPlantao)}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
              <Eye className="h-4 w-4" /> Imprimir
            </button>
            <button onClick={() => setVisualizando(null)}
              className="rounded-xl border border-graphite-300/60 bg-white/80 px-3 py-1.5 text-sm font-medium text-graphite-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-graphite-50 hover:border-graphite-300 dark:border-graphite-700/40 dark:bg-graphite-800/80 dark:text-graphite-200 dark:hover:bg-graphite-700/50">
              Fechar
            </button>
          </div>
        </div>
        <div id="print-area" className="rounded-xl border border-graphite-200 bg-white p-4 dark:border-graphite-700 dark:bg-graphite-900">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div><p className="text-xs text-graphite-400">Equipe</p><p className="text-sm font-medium">{visualizando.equipe}</p></div>
            <div><p className="text-xs text-graphite-400">Chefe de Equipe</p><p className="text-sm font-medium">{visualizando.chefeEquipe || '-'}</p></div>
            <div><p className="text-xs text-graphite-400">Data</p><p className="text-sm font-medium">{formatDate(visualizando.dataPlantao)}</p></div>
            <div><p className="text-xs text-graphite-400">Horário</p><p className="text-sm font-medium">{visualizando.horarioInicio} às {visualizando.horarioTermino}</p></div>
            <div><p className="text-xs text-graphite-400">Turno</p><p className="text-sm font-medium">{visualizando.turno}</p></div>
          </div>

          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Guarnições</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white/60 p-3 backdrop-blur-sm dark:bg-graphite-800/60">
                <p className="mb-1 text-xs font-bold text-graphite-500">CCI 02</p>
                <p className="text-sm">BA-MC: {visualizando.guarnicoes.cci02.baMc || '-'}</p>
                <p className="text-sm">BA-CE: {visualizando.guarnicoes.cci02.baCe || '-'}</p>
                <p className="text-sm">BA-2: {visualizando.guarnicoes.cci02.ba2 || '-'}</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-3 backdrop-blur-sm dark:bg-graphite-800/60">
                <p className="mb-1 text-xs font-bold text-graphite-500">CCI 03</p>
                <p className="text-sm">BA-MC: {visualizando.guarnicoes.cci03.baMc || '-'}</p>
                <p className="text-sm">BA-2: {visualizando.guarnicoes.cci03.ba2_1 || '-'}</p>
                <p className="text-sm">BA-2: {visualizando.guarnicoes.cci03.ba2_2 || '-'}</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-3 backdrop-blur-sm dark:bg-graphite-800/60">
                <p className="mb-1 text-xs font-bold text-graphite-500">CRS</p>
                <p className="text-sm">BA-MC: {visualizando.guarnicoes.crs.baMc || '-'}</p>
                <p className="text-sm">BA-LR: {visualizando.guarnicoes.crs.baLr || '-'}</p>
                <p className="text-sm">BA-RE: {visualizando.guarnicoes.crs.baRe1 || '-'}</p>
                <p className="text-sm">BA-RE: {visualizando.guarnicoes.crs.baRe2 || '-'}</p>
              </div>
            </div>
          </div>

          {([['BDS', visualizando.bds], ['PTR-1', visualizando.ptr1], ['PTR-2', visualizando.ptr2]] as const).map(([label, slot]) => (
            <div key={label} className="mb-4">
              <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">{label}</p>
              <p className="text-sm">{slot.funcao || '-'}: {slot.nomeGuerra || '-'}</p>
            </div>
          ))}

          {visualizando.atestados.length > 0 && (
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Atestados</p>
              {visualizando.atestados.map((a, i) => <p key={i} className="text-sm">- {a}</p>)}
            </div>
          )}

          {visualizando.trocas.length > 0 && (
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Trocas</p>
              {visualizando.trocas.map((t, i) => (
                <p key={i} className="text-sm">- {t.funcaoSaindo} {t.nomeSaindo} ↔ {t.funcaoEntrando} {t.nomeEntrando}</p>
              ))}
            </div>
          )}

          {visualizando.radio.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Escala de Rádio</p>
              {visualizando.radio.map((r, i) => (
                <p key={i} className="text-sm">- {r.funcao} {r.nomeGuerra}: {r.horarioInicio} às {r.horarioFim}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (escalas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-graphite-700 dark:bg-graphite-900">
        <Calendar className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
        <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhuma escala encontrada</h3>
        <p className="text-sm text-graphite-500">As escalas diárias aparecerão aqui para visualização.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-graphite-500 dark:text-graphite-400">{escalas.length} escala(s) registrada(s)</p>
      </div>
      <div className="space-y-2">
        {escalas.map(e => (
          <div key={e.id}
            onClick={() => setVisualizando(e)}
            className="flex cursor-pointer items-center justify-between rounded-2xl border border-graphite-200/60 bg-white/80 p-3 backdrop-blur-sm transition-all duration-200 hover:bg-aviation-50/50 dark:border-graphite-700/40 dark:bg-graphite-900/80 dark:hover:bg-aviation-900/20"
          >
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-aviation-600 dark:text-aviation-400" />
              <div>
                <p className="text-sm font-semibold text-graphite-900 dark:text-graphite-100">{e.equipe}</p>
                <p className="text-xs text-graphite-500">{formatDate(e.dataPlantao)} · {e.turno} · {e.horarioInicio} às {e.horarioTermino}</p>
              </div>
            </div>
            <Eye className="h-4 w-4 text-graphite-400" />
          </div>
        ))}
      </div>
    </div>
  );
}
