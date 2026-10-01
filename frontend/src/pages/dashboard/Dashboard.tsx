import { Boxes, Calculator, ShoppingCart, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import KpiCard from "../../components/common/KpiCard";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { useEnterpriseStore } from "../../hooks/useEnterpriseStore";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function Dashboard() {
  const { report, operations, targets, settings } = useEnterpriseStore();
  const { user } = useAuth();
  const stock = report?.stockByProduct.reduce((total, item) => total + item.stock, 0) ?? 0;
  const salesByBranch = report?.salesByBranch.map((item) => ({ name: item.name, total: item.sales })) ?? [];

  return <div>
    <PageHeader eyebrow="Panel ejecutivo" title="Dashboard" description="Indicadores calculados con datos guardados en la base de datos." />
    <section className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Ventas acumuladas" value={formatCurrency(report?.totalSales ?? 0, settings.currency)} icon={ShoppingCart} />
        <KpiCard title="Unidades vendidas" value={String(report?.unitsSold ?? 0)} icon={ShoppingCart} />
        <KpiCard title="Unidades en inventario" value={stock.toLocaleString("es-PE")} icon={Boxes} />
        <KpiCard title="Cálculos registrados" value={String(report?.operationsCount ?? 0)} icon={Calculator} />
      </div>

      {salesByBranch.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Aún no hay sucursales ni ventas registradas. Los indicadores aparecerán al ingresar datos.</p> : <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-950">Ventas por sucursal</h2>
        <div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={salesByBranch}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value) => formatCurrency(Number(value), settings.currency)} /><Bar dataKey="total" name="Ventas" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </div>}

      <div className="grid gap-6 lg:grid-cols-2">
        {user?.role !== "Consulta" && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Actividad matemática reciente</h2>{operations.length === 0 ? <p className="mt-4 text-sm text-slate-500">Aún no hay cálculos registrados.</p> : <div className="mt-4 divide-y divide-slate-100">{operations.slice(0, 4).map((operation) => <div key={operation.id} className="flex justify-between gap-4 py-3 text-sm"><div><p className="font-medium text-slate-800">{operation.type}</p><p className="text-xs text-slate-500">{operation.inputs}</p></div><p className="text-xs text-slate-500">{formatDate(operation.createdAt)}</p></div>)}</div>}</div>}
        {user?.role !== "Consulta" && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Target size={19} className="text-blue-600" /><h2 className="font-semibold text-slate-950">Metas registradas</h2></div><p className="mt-4 text-3xl font-bold text-slate-950">{targets.length}</p><p className="mt-2 text-sm text-slate-500">La tabla actual no tiene período; por eso no se muestra un porcentaje de cumplimiento sin una comparación válida.</p>{user?.role === "Administrador" && <Link to="/metas" className="mt-4 inline-block text-sm font-semibold text-blue-700">Gestionar metas</Link>}</div>}
      </div>
    </section>
  </div>;
}
