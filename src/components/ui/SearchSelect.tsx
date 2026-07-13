import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check, X } from 'lucide-react';
import { listarAtivos } from '../../services/bombeiroService';
import { listarAPOCs } from '../../services/apocService';
import { ABBR_CARGO } from '../../types/ferias';

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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
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

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        top: rect.bottom + 4,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        const menu = document.getElementById('searchselect-menu');
        if (menu && !menu.contains(e.target as Node)) setOpen(false);
        if (!menu) setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  function handleOpen() {
    setOpen(true);
    setTimeout(updatePosition, 0);
  }

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      <div
        onClick={() => { if (open) setOpen(false); else handleOpen(); }}
        className="flex cursor-pointer items-center rounded-xl border border-graphite-300/70 bg-white/50 px-3 py-2 text-sm transition-all duration-200 hover:border-graphite-300 dark:border-border-dark dark:bg-surface-card/30 dark:hover:border-graphite-600"
      >
        <Search className="mr-2 h-4 w-4 text-graphite-400 shrink-0" />
        <span className={value ? 'text-graphite-900 dark:text-graphite-100 truncate' : 'text-graphite-400 truncate'}>
          {selected ? (showCargo && selected.cargo ? `${selected.cargo} ${selected[valueField]}` : selected[valueField]) : placeholder || 'Selecione...'}
        </span>
      </div>

      {open && createPortal(
        <div id="searchselect-menu" style={menuStyle} className="animate-fadeIn rounded-2xl border border-graphite-200/60 bg-white shadow-xl shadow-black/5 dark:border-border-dark dark:bg-surface-elevated/95">
          <div className="p-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Digite para pesquisar..."
              className="w-full rounded-xl border border-graphite-200 bg-graphite-50/80 px-3 py-2 text-sm outline-none transition-all duration-200 placeholder:text-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:placeholder:text-graphite-500"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-graphite-400">Nenhum resultado encontrado</p>
            ) : (
              filtered.map(b => {
                const isDisabled = disabledIds?.has(b.id) || false;
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={isDisabled}
                    title={isDisabled ? (disabledTooltip || 'Pessoa nao atende os requisitos para esta funcao') : undefined}
                    onClick={() => { if (!isDisabled) { onChange(b[valueField]); setOpen(false); setSearch(''); } }}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                      isDisabled
                        ? 'cursor-not-allowed opacity-50 text-red-500 dark:text-red-400'
                        : b[valueField] === value
                          ? 'bg-aviation-50 text-aviation-700 shadow-sm dark:bg-aviation-900/30 dark:text-aviation-300 hover:bg-aviation-100 dark:hover:bg-aviation-900/40'
                          : 'text-graphite-700 dark:text-graphite-300 hover:bg-aviation-50 dark:hover:bg-aviation-900/20'
                    }`}
                  >
                    <span className="flex-1 truncate">
                      <span className={`font-medium ${isDisabled ? 'text-red-600 dark:text-red-400 line-through' : ''}`}>
                        {showCargo && b.cargo ? `${b.cargo} ` : ''}{b.nomeGuerra}
                      </span>
                      <span className={`ml-2 text-xs ${isDisabled ? 'text-red-400 dark:text-red-500' : 'text-graphite-400'}`}>{showCargo && b.cargo ? b.nomeCompleto : b.nomeCompleto}</span>
                    </span>
                    {isDisabled && <X className="h-4 w-4 shrink-0 text-red-400" />}
                    {!isDisabled && b[valueField] === value && <Check className="h-4 w-4 shrink-0 text-aviation-600" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
