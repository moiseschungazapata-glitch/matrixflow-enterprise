import { Calculator, Search } from "lucide-react";
import { useMemo, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useEnterpriseStore } from "../../hooks/useEnterpriseStore";
import { formatDate, formatResult } from "../../utils/formatters";

export default function Historial() {
  const { operations } = useEnterpriseStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const filtered = useMemo(() => operations.filter((operation) => `${operation.type} ${operation.inputs} ${operation.user}`.toLowerCase().includes(search.toLowerCase()) && (category === "all" || operation.category === category)), [operations, search, category]);
  return (
    <div>
      <PageHeader eyebrow="Trazabilidad" title="Historial de operaciones" description="Consulta entradas, resultados, usuario, fecha y estado de cada cálculo." />
      <section className="space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar operación o usuario" className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500" /></div><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"><option value="all">Todas las categorías</option><option>Vector</option><option>Matriz</option></select></div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filtered.length === 0 ? <EmptyState title="Sin operaciones" description="Ejecuta un cálculo matemático para generar el historial." /> : <div className="divide-y divide-slate-100">{filtered.map((operation) => <article key={operation.id} className="grid gap-4 p-5 hover:bg-slate-50 lg:grid-cols-[auto_1fr_1fr_auto] lg:items-center"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Calculator size={19} /></div><div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-slate-900">{operation.type}</h2><span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{operation.category}</span></div><p className="mt-1 text-xs text-slate-500">{operation.inputs}</p></div><pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 px-3 py-2 font-mono text-xs text-cyan-300">{formatResult(operation.result)}</pre><div className="text-left lg:text-right"><StatusBadge label={operation.status} /><p className="mt-2 text-xs text-slate-500">{operation.user}</p><p className="mt-0.5 text-[11px] text-slate-400">{formatDate(operation.createdAt)}</p></div></article>)}</div>}
        </div>
      </section>
    </div>
  );
}
