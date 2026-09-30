import { Boxes, Package, ShoppingCart, Target } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import KpiCard from "../../components/common/KpiCard";
import PageHeader from "../../components/common/PageHeader";
import { useMockStore } from "../../hooks/useMockStore";
import { useTheme } from "../../hooks/useTheme";
import { formatCurrency, formatDate } from "../../utils/formatters";

const colors = ["#2563eb", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981"];

export default function Dashboard() {
  const { sales, branches, products, inventory, operations, settings } = useMockStore();
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const totalSales = sales.filter((sale) => sale.status === "Completada").reduce((total, sale) => total + sale.total, 0);
  const totalStock = inventory.reduce((total, item) => total + item.stock, 0);
  const lowStock = inventory.filter((item) => item.stock <= (products.find((product) => product.id === item.productId)?.minimumStock ?? 0)).length;

  const salesByBranch = useMemo(() => branches.map((branch) => ({
    name: branch.city,
    total: sales.filter((sale) => sale.branchId === branch.id).reduce((sum, sale) => sum + sale.total, 0),
  })), [branches, sales]);

  const salesByProduct = useMemo(() => products.map((product) => ({
    name: product.name.split(" ").slice(0, 2).join(" "),
    value: sales.filter((sale) => sale.productId === product.id).reduce((sum, sale) => sum + sale.quantity, 0),
  })).filter((item) => item.value > 0), [products, sales]);

  return (
    <div>
      <PageHeader eyebrow="Panel ejecutivo" title="Dashboard" description="Resumen de ventas, inventario y actividad matemática de la empresa." />
      <section className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Ventas acumuladas" value={formatCurrency(totalSales, settings.currency)} change="12.5%" trend="up" icon={ShoppingCart} />
          <KpiCard title="Productos activos" value={String(products.filter((product) => product.status === "Activo").length)} change="8.2%" trend="up" icon={Package} />
          <KpiCard title="Unidades en inventario" value={totalStock.toLocaleString("es-PE")} change={`${lowStock} alertas`} trend={lowStock > 0 ? "down" : "up"} icon={Boxes} />
          <KpiCard title="Cumplimiento de meta" value="87.6%" change="5.1%" trend="up" icon={Target} />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div><h2 className="font-semibold text-slate-950">Ventas por sucursal</h2><p className="mt-1 text-sm text-slate-500">Importe acumulado por sede</p></div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={salesByBranch} margin={{ left: -18, right: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#e2e8f0"} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} /><Tooltip formatter={(value) => formatCurrency(Number(value), settings.currency)} cursor={{ fill: darkMode ? "#1e293b" : "#f8fafc" }} contentStyle={{ backgroundColor: darkMode ? "#0f172a" : "#ffffff", borderColor: darkMode ? "#334155" : "#e2e8f0", borderRadius: 12, color: darkMode ? "#e2e8f0" : "#0f172a" }} /><Bar dataKey="total" fill="#2563eb" radius={[7, 7, 0, 0]} maxBarSize={48} /></BarChart></ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">Unidades por producto</h2><p className="mt-1 text-sm text-slate-500">Distribución de ventas registradas</p>
            <div className="mt-4 h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={salesByProduct} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>{salesByProduct.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: darkMode ? "#0f172a" : "#ffffff", borderColor: darkMode ? "#334155" : "#e2e8f0", borderRadius: 12, color: darkMode ? "#e2e8f0" : "#0f172a" }} /></PieChart></ResponsiveContainer></div>
            <div className="space-y-2">{salesByProduct.slice(0, 4).map((item, index) => <div key={item.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{item.name}</span><strong className="text-slate-800">{item.value} und.</strong></div>)}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Actividad matemática reciente</h2><div className="mt-4 divide-y divide-slate-100">{operations.slice(0, 4).map((operation) => <div key={operation.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium text-slate-800">{operation.type}</p><p className="mt-0.5 text-xs text-slate-500">{operation.inputs}</p></div><div className="text-right"><p className="text-xs font-medium text-emerald-600">{operation.status}</p><p className="mt-0.5 text-[11px] text-slate-400">{formatDate(operation.createdAt)}</p></div></div>)}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm"><p className="text-sm font-semibold text-cyan-400">Indicador destacado</p><h2 className="mt-2 text-xl font-semibold">Inventario disponible para operación</h2><p className="mt-2 text-sm leading-6 text-slate-300">{totalStock - lowStock} unidades se encuentran dentro de los niveles operativos definidos. Revisa {lowStock} posiciones con stock bajo.</p><div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-[82%] rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" /></div><div className="mt-2 flex justify-between text-xs text-slate-400"><span>Disponibilidad</span><span>82%</span></div></div>
        </div>
      </section>
    </div>
  );
}
