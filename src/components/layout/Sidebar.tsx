import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useSidebar } from '../../hooks/useSidebar';
import { useAuth } from '../../context/AuthContext';
import { Tooltip } from '../ui/Tooltip';
import { menuItems } from '../../services/menuData';
import type { MenuItem as MenuItemType } from '../../types/navigation';

function isVisible(item: MenuItemType, isAdmin: boolean): boolean {
  if (item.adminOnly && !isAdmin) return false;
  if (item.children) {
    const visibleChildren = item.children.filter(c => isVisible(c, isAdmin));
    if (visibleChildren.length === 0) return false;
  }
  return true;
}

function filterMenu(items: MenuItemType[], isAdmin: boolean): MenuItemType[] {
  return items.filter(item => isVisible(item, isAdmin)).map(item => {
    if (item.children) {
      return { ...item, children: filterMenu(item.children, isAdmin) };
    }
    return item;
  });
}

function SidebarItem({ item, collapsed, depth = 0 }: { item: MenuItemType; collapsed: boolean; depth?: number }) {
  const Icon = item.icon;

  if (item.children) {
    return (
      <SidebarGroup item={item} collapsed={collapsed} depth={depth} />
    );
  }

  const link = item.path ? (
    <NavLink
      to={item.path}
      end={item.path === '/ocorrencias'}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-white/15 text-white shadow-sm'
            : 'text-aviation-200 hover:bg-white/10 hover:text-white'
        } ${depth === 0 ? 'px-3 py-2.5' : 'px-3 py-2 ml-3'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white" />
          )}
          <Icon className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${depth === 0 ? 'h-5 w-5' : 'h-4 w-4'}`} />
          <span
            className={`whitespace-nowrap transition-all duration-300 ${
              collapsed ? 'w-0 opacity-0 overflow-hidden' : 'opacity-100'
            }`}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  ) : null;

  if (!link) return null;

  return collapsed ? (
    <li className="group">
      <Tooltip text={item.label} position="right">
        {link}
      </Tooltip>
    </li>
  ) : (
    <li className="group">{link}</li>
  );
}

function SidebarGroup({ item, collapsed, depth = 0 }: { item: MenuItemType; collapsed: boolean; depth?: number }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;

  if (collapsed) {
    return (
      <li className="group">
        <Tooltip text={item.label} position="right">
          <button
            onClick={() => setOpen(!open)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-aviation-200 transition-all duration-200 hover:bg-white/10 hover:text-white"
          >
            <Icon className="h-5 w-5 shrink-0" />
          </button>
        </Tooltip>
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 text-aviation-200 hover:bg-white/10 hover:text-white ${open ? 'mb-1' : ''} ${depth === 0 ? 'px-3 py-2.5' : 'px-3 py-2'}`}
      >
        <Icon className={`shrink-0 transition-transform duration-200 ${open ? 'scale-105' : ''} ${depth === 0 ? 'h-5 w-5' : 'h-4 w-4'}`} />
        <span className="flex-1 text-left whitespace-nowrap">
          {item.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-all duration-300 ${
            open ? 'rotate-0 text-white' : '-rotate-90'
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out-expo ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <ul className="ml-3 space-y-0.5 border-l-2 border-white/15 pl-3">
          {item.children?.map((child) => (
            <SidebarItem key={child.label} item={child} collapsed={collapsed} depth={depth + 1} />
          ))}
        </ul>
      </div>
    </li>
  );
}

export function Sidebar() {
  const { collapsed, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_master';
  const visibleMenu = filterMenu(menuItems, isAdmin);

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col bg-graphite-950 border-r border-white/5 transition-all duration-500 ease-out-expo ${
        collapsed ? 'w-[70px]' : 'w-[260px]'
      }`}
    >
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm">
            <img src="/logobombeiro.jpeg" alt="SCI NVT" className="h-full w-full object-cover" />
          </div>
          <span
            className={`whitespace-nowrap text-lg font-bold text-white transition-all duration-300 ${
              collapsed ? 'w-0 opacity-0 overflow-hidden pointer-events-none' : 'opacity-100'
            }`}
          >
            SCI NVT
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="ml-auto rounded-xl p-1.5 text-aviation-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-4">
        <ul className="space-y-0.5">
          {visibleMenu.map((item) => (
            <SidebarItem key={item.label} item={item} collapsed={collapsed} />
          ))}
        </ul>
      </nav>

      <div className="mx-3 mb-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="px-3 pb-3 text-center text-[10px] font-medium uppercase tracking-widest text-aviation-400">
        {collapsed ? '' : 'SCI NVT v1.0'}
      </div>
    </aside>
  );
}
