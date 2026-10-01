import { useState } from "react";
import { Plus, Target } from "lucide-react";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import { useEnterpriseStore } from "../../hooks/useEnterpriseStore";
import { getApiErrorMessage } from "../../services/api/enterprise";
import type { TargetRecord } from "../../types";
import { formatCurrency } from "../../utils/formatters";

const emptyTarget = { branchId: 0, name: "", targetValue: 0 };

export default function Metas() {
  const { branches, targets, settings, saveTarget, removeTarget } = useEnterpriseStore();
  const [form, setForm] = useState(emptyTarget);
  const [editing, setEditing] = useState<TargetRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const create = () => { setForm(emptyTarget); setEditing(null); setMessage(""); setOpen(true); };
  const edit = (target: TargetRecord) => { setForm({ branchId: target.branchId, name: target.name, targetValue: target.targetValue }); setEditing(target); setMessage(""); setOpen(true); };
  const save = async () => {
    if (!form.branchId || form.name.trim().length < 3 || !Number.isFinite(form.targetValue) || form.targetValue <= 0) {
      setMessage("Selecciona una sucursal, escribe el nombre de la meta y un importe mayor que cero."); return;
    }
    try {
      await saveTarget({ ...form, id: editing?.id });
      setOpen(false); setMessage("Meta guardada en la base de datos.");
    } catch (error) { setMessage(getApiErrorMessage(error)); }
  };
  const remove = async (target: TargetRecord) => {
    if (!window.confirm(`¿Eliminar la meta ${target.name}?`)) return;
    try { await removeTarget(target.id); setMessage("Meta eliminada."); }
    catch (error) { setMessage(getApiErrorMessage(error)); }
  };

  return <div>
    <PageHeader eyebrow="Gestión empresarial" title="Metas" description="Registra metas por sucursal usando la tabla targets existente." action={<button onClick={create} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} />Nueva meta</button>} />
    <section className="space-y-4 p-4 sm:p-6 lg:p-8">
      {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
      {targets.length === 0 && <p className="text-sm text-slate-500">Aún no hay metas registradas.</p>}
      <div className="grid gap-4 md:grid-cols-2">{targets.map((target) => <article key={target.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3"><Target size={22} className="text-blue-600" /><div><h2 className="font-semibold text-slate-900">{target.name}</h2><p className="text-sm text-slate-500">{branches.find((branch) => branch.id === target.branchId)?.name ?? "Sucursal no disponible"}</p></div></div>
        <p className="mt-4 text-xl font-bold text-slate-900">{formatCurrency(target.targetValue, settings.currency)}</p>
        <div className="mt-4 flex gap-3"><button onClick={() => edit(target)} className="text-sm font-semibold text-blue-700">Editar</button><button onClick={() => void remove(target)} className="text-sm font-semibold text-rose-700">Eliminar</button></div>
      </article>)}</div>
    </section>
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar meta" : "Nueva meta"} description="La tabla actual guarda sucursal, nombre e importe; no define un período.">
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Sucursal<select value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5"><option value={0}>Selecciona una sucursal</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Nombre<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" /></label>
        <label className="block text-sm font-medium text-slate-700">Importe objetivo<input type="number" min="0.01" step="0.01" value={form.targetValue} onChange={(event) => setForm((current) => ({ ...current, targetValue: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" /></label>
        {message && <p role="alert" className="text-sm text-rose-700">{message}</p>}
        <div className="flex justify-end gap-3"><button onClick={() => setOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button><button onClick={() => void save()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Guardar meta</button></div>
      </div>
    </Modal>
  </div>;
}
