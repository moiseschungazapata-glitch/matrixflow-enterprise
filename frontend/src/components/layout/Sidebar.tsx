import { BarChart3, Building2, Calculator, ChevronRight, FileClock, GitMerge, LayoutDashboard, LogOut, Package, Settings, ShoppingCart, Sigma, Table2, Target, Users, Warehouse, X, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface SidebarProps { open: boolean; onClose: () => void }
interface MenuItem { label: string; path: string; icon: LucideIcon; access?: "business" | "admin" }

const groups: { label: string; items: MenuItem[] }[] = [
  { label: "GENERAL", items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] },
  { label: "EMPRESA", items: [
    { label: "Empresa", path: "/empresa", icon: Building2, access: "business" },
    { label: "Sucursales", path: "/sucursales", icon: Warehouse, access: "business" },
    { label: "Productos", path: "/productos", icon: Package, access: "business" },
    { label: "Ventas", path: "/ventas", icon: ShoppingCart, access: "business" },
    { label: "Inventario", path: "/inventario", icon: Table2, access: "business" },
  ] },
  { label: "ANÁLISIS MATEMÁTICO", items: [
    { label: "Vectores", path: "/vectores", icon: Sigma, access: "business" },
    { label: "Matrices", path: "/matrices", icon: Calculator, access: "business" },
    { label: "Operaciones", path: "/operaciones", icon: ChevronRight, access: "business" },
    { label: "Combinaciones lineales", path: "/combinaciones-lineales", icon: GitMerge, access: "business" },
  ] },
  { label: "GESTIÓN", items: [
    { label: "Historial", path: "/historial", icon: FileClock, access: "business" },
    { label: "Reportes", path: "/reportes", icon: BarChart3 },
    { label: "Metas", path: "/metas", icon: Target, access: "admin" },
    { label: "Usuarios", path: "/usuarios", icon: Users, access: "admin" },
    { label: "Configuración", path: "/configuracion", icon: Settings },
  ] },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { logout, user } = useAuth();
  return (
    <>
      {open && <button className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={onClose} aria-label="Cerrar navegación" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-white transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 font-black">M</div>
          <div><h1 className="text-sm font-bold tracking-[0.14em]">MATRIXFLOW</h1><p className="text-[10px] font-semibold tracking-[0.22em] text-cyan-400">ENTERPRISE</p></div>
          <button className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden" onClick={onClose} aria-label="Cerrar navegación"><X size={19} /></button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {groups.map((group) => ({ ...group, items: group.items.filter((item) => !item.access || (item.access === "business" ? user?.role !== "Consulta" : user?.role === "Administrador")) })).filter((group) => group.items.length > 0).map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-500">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return <NavLink key={item.path} to={item.path} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Icon size={18} /><span>{item.label}</span></NavLink>;
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"><LogOut size={18} />Cerrar sesión</button>
        </div>
      </aside>
    </>
  );
}
