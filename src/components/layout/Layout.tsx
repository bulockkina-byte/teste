import { Outlet } from 'react-router-dom';
import { useSidebar } from '../../hooks/useSidebar';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-graphite-50 dark:bg-graphite-950">
      <Sidebar />
      <div
        className={`transition-all duration-300 ${
          collapsed ? 'ml-[70px]' : 'ml-[260px]'
        }`}
      >
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
