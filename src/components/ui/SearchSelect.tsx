import { useState, useRef, useEffect } from 'react';
import { Search, Check, X } from 'lucide-react';
import { listarAtivos } from '../../services/bombeiroService';
import { listarAPOCs } from '../../services/apocService';

interface AtivoItem {
  id: string;
  nomeGuerra: string;
  nomeCompleto: string;
  cargo?: string;
  equipe?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  cargo?: string;
  equipe?: string;
  valueField?: 'nomeGuerra' | 'nomeCompleto';
  disabledIds?: Set<string>;
  disabledTooltip?: string;
  showCargo?: boolean;
}

export function SearchSelect({ value, onChange, placeholder, className = '', cargo, equipe, valueField = 'nomeGuerra', disabledIds, disabledTooltip, showCargo }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const [ativos, setAtivos] = useState<AtivoItem[]>([]);

  useEffect(() => {
    async function carregar() {
      let lista: AtivoItem[];
      if (cargo === 'APOC') {
        lista = (await listarAPOCs()).map(a => ({ id: a.id, nomeGuerra: a.nomeGuerra, nomeCompleto: a.nomeCompleto }));
      } else if (cargo) {
        lista = (await listarAtivos()).filter(b => b.cargo === cargo).map(b => ({ id: b.id, nomeGuerra: b.nomeGuerra, nomeCompleto: b.nomeCompleto, cargo: b.cargo, equipe: b.equipe }));
      } else {
        const bombeiros = (await listarAtivos()).map(b => ({ id: b.id, nomeGuerra: b.nomeGuerra, nomeCompleto: b.nomeCompleto, cargo: b.cargo, equipe: b.equipe }));
        const apocs = (await listarAPOCs()).map(a => ({ id: a.id, nomeGuerra: a.nomeGuerra, nomeCompleto: a.nomeCompleto }));
        lista = [...bombeiros, ...apocs];
      }
      if (equipe) lista = lista.filter(b => b.equipe === equipe);
      setAtivos(lista);
    }
    carregar();
  }, [cargo, equipe]);

  const filtered = ativos.filter(b =>
    b.nomeGuerra.toLowerCase().includes(search.toLowerCase()) ||
    b.nomeCompleto.toLowerCase().includes(search.toLowerCase())
  );

  const selected = ativos.find(b => b[valueField] === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      <div
        onClick={() => setOpen(prev => !prev)}
        className="flex cursor-pointer items-center rounded-xl border border-graphite-300/70 bg-white/50 px-3 py-2 text-sm transition-all duration-200 hover:border-graphite-300 dark:border-border-dark dark:bg-surface-card/30 dark:hover:border-graphite-600"
      >
        <Search className="mr-2 h-4 w-4 text-graphite-400 shrink-0" />
        <span className={value ? 'text-graphite-900 dark:text-graphite-100 truncate' : 'text-graphite-400 truncate'}>
          {selected ? (showCargo && selected.cargo ? `${selected.cargo} ${selected[valueField]}` : selected[valueField]) : placeholder || 'Selecione...'}
        </span>
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-2xl border border-graphite-200/60 bg-white shadow-xl shadow-black/5 dark:border-border-dark dark:bg-surface-elevated/95" style={{ maxHeight: 260, overflowY: 'auto' }}>
          <div className="p-2">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Digite para pesquisar..." autoFocus
              className="w-full rounded-xl border border-graphite-200 bg-graphite-50/80 px-3 py-2 text-sm outline-none placeholder:text-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100" />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-graphite-400">Nenhum resultado</p>
            ) : (
              filtered.map(b => {
                const isDisabled = disabledIds?.has(b.id) || false;
                return (
                  <button key={b.id} type="button" disabled={isDisabled}
                    title={isDisabled ? (disabledTooltip || 'Pessoa não atende os requisitos') : undefined}
                    onClick={() => { if (!isDisabled) { onChange(b[valueField]); setOpen(false); setSearch(''); } }}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                      isDisabled ? 'cursor-not-allowed opacity-50 text-red-500' :
                      b[valueField] === value ? 'bg-aviation-50 text-aviation-700 shadow-sm hover:bg-aviation-100' :
                      'text-graphite-700 hover:bg-aviation-50'
                    }`}>
                    <span className="flex-1 truncate">
                      <span className={`font-medium ${isDisabled ? 'text-red-600 line-through' : ''}`}>
                        {showCargo && b.cargo ? `${b.cargo} ` : ''}{b.nomeGuerra}
                      </span>
                      <span className={`ml-2 text-xs ${isDisabled ? 'text-red-400' : 'text-graphite-400'}`}>{b.nomeCompleto}</span>
                    </span>
                    {isDisabled && <X className="h-4 w-4 shrink-0 text-red-400" />}
                    {!isDisabled && b[valueField] === value && <Check className="h-4 w-4 shrink-0 text-aviation-600" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
