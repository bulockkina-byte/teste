import { useState, useEffect } from 'react';
import { Truck, Search } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarViaturas, buscarViatura } from '../../services/viaturaService';
import type { Viatura } from '../../types/viatura';

export function Viaturas() {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [termo, setTermo] = useState('');

  useEffect(() => {
    setViaturas(termo ? buscarViatura(termo) : listarViaturas());
  }, [termo]);

  function capitalize(str: string) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }

  function situacaoBadge(s: string) {
    if (s === 'Ativa') return 'bg-status-green/10 text-status-green';
    if (s === 'Em Manutenção') return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-red-50 text-alert-red dark:bg-red-900/20 dark:text-red-400';
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle icon={Truck} title="Viaturas CCI" />
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Pesquisar por prefixo, placa, marca ou equipe..."
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated"
          />
        </div>
        <p className="text-sm text-graphite-500 dark:text-graphite-400">{viaturas.length} viatura(s)</p>
      </div>

      {viaturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
          <Truck className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
            Nenhuma viatura cadastrada
          </h3>
          <p className="text-sm text-graphite-400">
            Nenhuma viatura foi encontrada no sistema.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-graphite-200/60 bg-white/80 backdrop-blur-sm dark:border-border-dark dark:bg-surface-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 bg-graphite-50 text-left dark:border-border-dark dark:bg-surface-card">
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Prefixo</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Placa</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Tipo</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Marca / Modelo</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Ano</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Cor</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Equipe</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Situação</th>
              </tr>
            </thead>
            <tbody>
              {viaturas.map(v => (
                <tr
                  key={v.id}
                  className="border-b border-graphite-100 transition-colors hover:bg-aviation-50/50 dark:border-border-dark dark:hover:bg-aviation-900/20"
                >
                  <td className="px-4 py-3 font-bold text-graphite-900 dark:text-graphite-100">{v.prefixo}</td>
                  <td className="px-4 py-3 font-mono text-graphite-700 dark:text-graphite-300">{v.placa}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-aviation-50 px-2.5 py-0.5 text-xs font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                      {v.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{capitalize(v.marca)} {capitalize(v.modelo)}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{v.ano || '-'}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{v.cor || '-'}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{v.equipe || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${situacaoBadge(v.situacao)}`}>
                      {v.situacao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}

export default Viaturas;
