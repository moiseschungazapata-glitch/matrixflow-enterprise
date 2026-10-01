import { BarChart3, Download, Package, ShoppingCart } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import KpiCard from "../../components/common/KpiCard";
import PageHeader from "../../components/common/PageHeader";
import { useEnterpriseStore } from "../../hooks/useEnterpriseStore";
import { formatCurrency } from "../../utils/formatters";

function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export default function Reportes() {
  const { report, settings } = useEnterpriseStore();
  const salesByBranch = report?.salesByBranch.map((item) => ({ name: item.name, ventas: item.sales, unidades: item.units })) ?? [];
  const stockByProduct = report?.stockByProduct.map((item) => ({ name: item.name, stock: item.stock })) ?? [];
  const exportCsv = () => {
    const rows = [["Sucursal", "Ventas", "Unidades"], ...salesByBranch.map((item) => [item.name, item.ventas, item.unidades])];
    const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "matrixflow-reporte-ventas.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div>
    <PageHeader eyebrow="Analítica empresarial" title="Reportes" description="Indicadores agregados desde la base de datos." action={<button onClick={exportCsv} disabled={salesByBranch.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"><Download size={17} />Exportar CSV</button>} />
    <section className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="Ingresos totales" value={formatCurrency(report?.totalSales ?? 0, settings.currency)} icon={ShoppingCart} />
        <KpiCard title="Unidades vendidas" value={String(report?.unitsSold ?? 0)} icon={Package} />
        <KpiCard title="Cálculos ejecutados" value={String(report?.operationsCount ?? 0)} icon={BarChart3} />
      </div>
      {salesByBranch.length === 0 && stockByProduct.length === 0 && <p className="text-sm text-slate-500">Aún no hay datos para generar gráficos.</p>}
      <div className="grid gap-6 xl:grid-cols-2">
        {salesByBranch.length > 0 && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Ventas por sucursal</h2><div className="mt-6 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={salesByBranch}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value, name) => name === "Ventas" ? formatCurrency(Number(value), settings.currency) : value} /><Legend /><Bar dataKey="ventas" name="Ventas" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>}
        {stockByProduct.length > 0 && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Stock por producto</h2><div className="mt-6 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={stockByProduct}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="stock" name="Stock total" stroke="#06b6d4" strokeWidth={3} /></LineChart></ResponsiveContainer></div></div>}
      </div>
    </section>
  </div>;
}
