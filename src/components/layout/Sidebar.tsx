import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, Plane } from 'lucide-react';
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
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-aviation-50 text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300'
            : 'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-400 dark:hover:bg-graphite-800'
        } ${depth === 0 ? 'px-3 py-2.5' : 'px-3 py-2'}`
      }
    >
      <Icon className={`shrink-0 ${depth === 0 ? 'h-5 w-5' : 'h-4 w-4'}`} />
      <span
        className={`whitespace-nowrap transition-opacity duration-300 ${
          collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
        }`}
      >
        {item.label}
      </span>
    </NavLink>
  ) : null;

  if (!link) return null;

  return collapsed ? (
    <li>
      <Tooltip text={item.label} position="right">
        {link}
      </Tooltip>
    </li>
  ) : (
    <li>{link}</li>
  );
}

function SidebarGroup({ item, collapsed, depth = 0 }: { item: MenuItemType; collapsed: boolean; depth?: number }) {
  const [open, setOpen] = useState(true);
  const Icon = item.icon;

  if (collapsed) {
    return (
      <li>
        <Tooltip text={item.label} position="right">
          <button
            onClick={() => setOpen(!open)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-graphite-600 transition-all duration-200 hover:bg-graphite-100 dark:text-graphite-400 dark:hover:bg-graphite-800"
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
        className={`flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 text-graphite-600 hover:bg-graphite-100 dark:text-graphite-400 dark:hover:bg-graphite-800 ${open ? 'mb-0.5' : ''} ${depth === 0 ? 'px-3 py-2.5' : 'px-3 py-2'}`}
      >
        <Icon className={`shrink-0 ${depth === 0 ? 'h-5 w-5' : 'h-4 w-4'}`} />
        <span className="flex-1 text-left whitespace-nowrap">
          {item.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <ul className="ml-2 space-y-0.5 border-l border-graphite-200 pl-2 dark:border-graphite-700">
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
  const isAdmin = user?.username === 'admin';
  const visibleMenu = filterMenu(menuItems, isAdmin);

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-graphite-200 bg-white transition-all duration-300 dark:border-graphite-800 dark:bg-graphite-900 ${
        collapsed ? 'w-[70px]' : 'w-[260px]'
      }`}
    >
      <div className="flex h-16 items-center border-b border-graphite-200 px-4 dark:border-graphite-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-aviation-600">
            <Plane className="h-5 w-5 text-white" />
          </div>
          <span
            className={`whitespace-nowrap text-lg font-bold text-aviation-600 dark:text-aviation-400 transition-opacity duration-300 ${
              collapsed ? 'opacity-0 w-0' : 'opacity-100'
            }`}
          >
            SESCINC Manager
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="ml-auto rounded-lg p-1.5 text-graphite-500 transition-colors hover:bg-graphite-100 dark:text-graphite-400 dark:hover:bg-graphite-800"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {visibleMenu.map((item) => (
            <SidebarItem key={item.label} item={item} collapsed={collapsed} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
