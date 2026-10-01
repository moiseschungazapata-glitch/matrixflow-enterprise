import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowDown, ArrowLeftRight, ArrowUp, Boxes, Edit3, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import KpiCard from "../../components/common/KpiCard";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useEnterpriseStore } from "../../hooks/useEnterpriseStore";
import { getApiErrorMessage } from "../../services/api/enterprise";
import { inventoryAdjustmentSchema, type InventoryAdjustmentFormData } from "../../schemas";
import type { InventoryItem, InventoryMovement } from "../../types";
import { formatDate } from "../../utils/formatters";

const movementStyle: Record<InventoryMovement["type"], { color: string; icon: typeof ArrowUp }> = {
  Entrada: { color: "bg-emerald-50 text-emerald-700", icon: ArrowUp },
  Salida: { color: "bg-rose-50 text-rose-700", icon: ArrowDown },
  Ajuste: { color: "bg-amber-50 text-amber-700", icon: ArrowLeftRight },
};

export default function Inventario() {
  const { inventory, inventoryMovements, products, branches, adjustInventory, createInventory } = useEnterpriseStore();
  const [creating, setCreating] = useState(false);
  const [newPosition, setNewPosition] = useState({ branchId: 0, productId: 0, stock: 0 });
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"stock" | "movements">("stock");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<InventoryAdjustmentFormData>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues: { stock: 0, reason: "" },
  });
  const filtered = useMemo(() => inventory.filter((item) => {
    const product = products.find((value) => value.id === item.productId)?.name ?? "";
    const branch = branches.find((value) => value.id === item.branchId)?.name ?? "";
    return `${product} ${branch}`.toLowerCase().includes(search.toLowerCase()) && (branchFilter === "all" || item.branchId === Number(branchFilter));
  }), [inventory, products, branches, search, branchFilter]);
  const filteredMovements = useMemo(() => inventoryMovements.filter((movement) => {
    const product = products.find((value) => value.id === movement.productId)?.name ?? "";
    const branch = branches.find((value) => value.id === movement.branchId)?.name ?? "";
    return `${product} ${branch} ${movement.reason} ${movement.user}`.toLowerCase().includes(search.toLowerCase()) && (branchFilter === "all" || movement.branchId === Number(branchFilter));
  }), [inventoryMovements, products, branches, search, branchFilter]);
  const total = inventory.reduce((sum, item) => sum + item.stock, 0);
  const low = inventory.filter((item) => item.stock <= (products.find((product) => product.id === item.productId)?.minimumStock ?? 0)).length;
  const showAdjustment = (item: InventoryItem) => { setEditing(item); reset({ stock: item.stock, reason: "" }); };
  const saveAdjustment = async (data: InventoryAdjustmentFormData) => {
    if (!editing) return;
    try {
      await adjustInventory(editing.id, data.stock, data.reason);
      setEditing(null);
      setView("movements");
      setMessage("Movimiento guardado en la base de datos.");
    } catch (error) { setMessage(getApiErrorMessage(error)); }
  };
  const savePosition = async () => {
    if (!newPosition.branchId || !newPosition.productId || newPosition.stock < 0) {
      setMessage("Selecciona sucursal, producto y un stock válido."); return;
    }
    try {
      await createInventory(newPosition);
      setCreating(false);
      setNewPosition({ branchId: 0, productId: 0, stock: 0 });
      setMessage("Existencia registrada en la base de datos.");
    } catch (error) { setMessage(getApiErrorMessage(error)); }
  };

  return (
    <div>
      <PageHeader eyebrow="Operaciones" title="Inventario" description="Controla existencias y conserva la trazabilidad de cada movimiento." action={<button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} />Nueva existencia</button>} />
      <section className="space-y-5 p-4 sm:p-6 lg:p-8">
        {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
        {inventory.length === 0 && <p className="text-sm text-slate-500">Aún no hay existencias registradas. Registra primero sucursales y productos.</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><KpiCard title="Unidades disponibles" value={total.toLocaleString("es-PE")} icon={Boxes} /><KpiCard title="Movimientos registrados" value={String(inventoryMovements.length)} icon={ArrowLeftRight} /><KpiCard title="Alertas de stock" value={String(low)} change={low ? "Requiere atención" : "Sin alertas"} trend={low ? "down" : "up"} icon={AlertTriangle} /></div>
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
          <div className="flex rounded-xl bg-slate-100 p-1"><button onClick={() => setView("stock")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === "stock" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Existencias</button><button onClick={() => setView("movements")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === "movements" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Movimientos</button></div>
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={view === "stock" ? "Buscar producto o sucursal" : "Buscar movimiento, motivo o usuario"} className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500" /></div>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"><option value="all">Todas las sucursales</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
        </div>

        {view === "stock" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Producto</th><th className="px-5 py-4">Sucursal</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Mínimo</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Actualización</th><th className="px-5 py-4" /></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((item) => { const product = products.find((value) => value.id === item.productId); const status = item.stock <= (product?.minimumStock ?? 0) ? "Stock bajo" : "Disponible"; return <tr key={item.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-900">{product?.name}</td><td className="px-5 py-4 text-slate-600">{branches.find((value) => value.id === item.branchId)?.name}</td><td className="px-5 py-4 text-lg font-bold text-slate-900">{item.stock}</td><td className="px-5 py-4 text-slate-500">{product?.minimumStock}</td><td className="px-5 py-4"><StatusBadge label={status} /></td><td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">{formatDate(item.updatedAt)}</td><td className="px-5 py-4"><button onClick={() => showAdjustment(item)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600" aria-label={`Ajustar ${product?.name}`}><Edit3 size={17} /></button></td></tr>; })}</tbody></table></div></div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Tipo</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Producto / sucursal</th><th className="px-5 py-4">Variación</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Motivo</th><th className="px-5 py-4">Usuario</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredMovements.map((movement) => { const style = movementStyle[movement.type]; const Icon = style.icon; return <tr key={movement.id} className="hover:bg-slate-50"><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.color}`}><Icon size={13} />{movement.type}</span></td><td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">{formatDate(movement.createdAt)}</td><td className="px-5 py-4"><p className="font-semibold text-slate-900">{products.find((product) => product.id === movement.productId)?.name}</p><p className="text-xs text-slate-500">{branches.find((branch) => branch.id === movement.branchId)?.name}</p></td><td className="px-5 py-4 font-semibold text-slate-700">{movement.type === "Salida" ? "−" : movement.type === "Entrada" ? "+" : "±"}{movement.quantity}</td><td className="px-5 py-4 text-slate-600">{movement.previousStock} → {movement.newStock}</td><td className="px-5 py-4 max-w-56 text-slate-600">{movement.reason}</td><td className="px-5 py-4 text-slate-600">{movement.user}</td></tr>; })}</tbody></table></div></div>
        )}
      </section>
      <Modal open={creating} onClose={() => setCreating(false)} title="Nueva existencia" description="Registra el stock inicial de un producto en una sucursal.">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Sucursal<select value={newPosition.branchId} onChange={(event) => setNewPosition((current) => ({ ...current, branchId: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5"><option value={0}>Selecciona una sucursal</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label className="block text-sm font-medium text-slate-700">Producto<select value={newPosition.productId} onChange={(event) => setNewPosition((current) => ({ ...current, productId: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5"><option value={0}>Selecciona un producto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="block text-sm font-medium text-slate-700">Stock inicial<input type="number" min="0" value={newPosition.stock} onChange={(event) => setNewPosition((current) => ({ ...current, stock: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" /></label>
          <div className="flex justify-end gap-3"><button onClick={() => setCreating(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button><button onClick={() => void savePosition()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Guardar existencia</button></div>
        </div>
      </Modal>
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Ajustar existencia" description="El cambio quedará registrado en el historial de movimientos.">
        <form onSubmit={handleSubmit(saveAdjustment)} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Nuevo stock<input {...register("stock", { valueAsNumber: true })} type="number" min="0" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" />{errors.stock && <span className="mt-1 block text-xs text-rose-600">{errors.stock.message}</span>}</label>
          <label className="block text-sm font-medium text-slate-700">Motivo del ajuste<textarea {...register("reason")} rows={3} placeholder="Ej. Regularización por conteo físico" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" />{errors.reason && <span className="mt-1 block text-xs text-rose-600">{errors.reason.message}</span>}</label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button><button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Guardar movimiento</button></div>
        </form>
      </Modal>
    </div>
  );
}
