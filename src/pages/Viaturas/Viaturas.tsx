import { useState, useEffect } from 'react';
import { Truck, Search } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarViaturas } from '../../services/viaturaService';
import type { Viatura, StatusViatura } from '../../types/viatura';
import { TIPO_VIATURA_OPTIONS, STATUS_VIATURA_OPTIONS } from '../../types/viatura';
import { useDebounce } from '../../hooks/useDebounce';

function statusColor(s: StatusViatura) {
  return STATUS_VIATURA_OPTIONS.find(o => o.value === s)?.color || '';
}

export function Viaturas() {
  const [lista, setLista] = useState<Viatura[]>([]);
  const [termo, setTermo] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  const debouncedTermo = useDebounce(termo, 400);

  useEffect(() => { (async () => setLista(await listarViaturas()))(); }, []);

  const filtrados = lista.filter(v => {
    const matchTermo = !debouncedTermo ||
      v.prefixo.toLowerCase().includes(debouncedTermo.toLowerCase()) ||
      v.placa.toLowerCase().includes(debouncedTermo.toLowerCase()) ||
      v.marca.toLowerCase().includes(debouncedTermo.toLowerCase()) ||
      v.modelo.toLowerCase().includes(debouncedTermo.toLowerCase());
    const matchTipo = !filterTipo || v.tipo === filterTipo;
    return matchTermo && matchTipo;
  });

  return (
    <PageContainer>
      <div className="mb-6">
        <PageTitle icon={Truck} title="Viaturas CCI" />
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input type="text" value={termo} onChange={e => setTermo(e.target.value)}
            placeholder="Pesquisar por prefixo, placa, marca..."
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-graphite-700" />
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
          className="rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm text-graphite-700 outline-none dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-200">
          <option value="">Todos os Tipos</option>
          {TIPO_VIATURA_OPTIONS.map(t => <option key={t} value={t} className="dark:bg-graphite-700">{t}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-3 mb-4 text-sm text-graphite-500 dark:text-graphite-400">
        <span>Total: <strong className="text-graphite-700 dark:text-graphite-200">{filtrados.length}</strong> viatura(s)</span>
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <Truck className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhuma viatura encontrada</h3>
          <p className="text-sm text-graphite-400">Nenhuma viatura cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(v => (
            <div key={v.id} className="rounded-2xl border border-graphite-200/60 bg-white/80 p-4 transition-all hover:shadow-md dark:border-border-dark dark:bg-surface-card">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {v.fotoUrl ? (
                    <img src={v.fotoUrl} alt={v.prefixo} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-graphite-100 to-graphite-200 dark:from-graphite-700 dark:to-graphite-800">
                      <Truck className="h-7 w-7 text-graphite-400 dark:text-graphite-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{v.prefixo || 'Sem prefixo'}</h3>
                      <span className="rounded-full bg-aviation-50 px-2 py-0.5 text-xs font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">{v.tipo}</span>
                      {v.tipo === 'CCI' && <span className="rounded-full bg-graphite-100 px-2 py-0.5 text-xs font-medium text-graphite-600 dark:bg-graphite-700 dark:text-graphite-300">{v.tipoCCI}</span>}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(v.status)}`}>{v.status}</span>
                    </div>
                    <p className="text-sm text-graphite-500 dark:text-graphite-400">
                      {v.placa ? `Placa: ${v.placa}` : ''}{v.marca ? ` · ${v.marca} ${v.modelo}` : ''}{v.ano ? ` · ${v.ano}` : ''}
                    </p>
                  </div>
                </div>
              </div>
              {v.tipo === 'CCI' && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-graphite-500 dark:text-graphite-400">
                  {v.capacidadeAgua && <span>Água: {v.capacidadeAgua}L</span>}
                  {v.capacidadeLGE && <span>· LGE: {v.capacidadeLGE}L</span>}
                  {v.moduloPQuimico && <span>· Pó: {v.moduloPQuimico}kg</span>}
                  {v.bombaModelo && <span>· Bomba: {v.bombaModelo}</span>}
                  {v.quilometragem && <span>· {v.quilometragem} km</span>}
                  {v.horasMotor && <span>· {v.horasMotor}h motor</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default Viaturas;
