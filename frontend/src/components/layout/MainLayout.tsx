import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useEnterpriseStore } from "../../hooks/useEnterpriseStore";
import ThemeToggle from "../common/ThemeToggle";
import Sidebar from "./Sidebar";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { isLoading, loadError, refresh } = useEnterpriseStore();
  return (
    <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <div className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur transition-colors sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/95">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => setSidebarOpen(true)} aria-label="Abrir navegación"><Menu size={21} /></button>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</p></div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">{user?.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
          </div>
        </div>
        <main>
          {isLoading && <p className="p-4 text-sm text-slate-600">Cargando datos de la base de datos...</p>}
          {loadError && <div role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError} <button onClick={() => void refresh()} className="ml-2 font-semibold underline">Reintentar</button></div>}
          {!isLoading && !loadError && <Outlet />}
        </main>
      </div>
    </div>
  );
}
