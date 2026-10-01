import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Plus, Sigma, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import { useEnterpriseStore } from "../../hooks/useEnterpriseStore";
import { getApiErrorMessage } from "../../services/api/enterprise";
import { vectorSchema, type VectorFormData } from "../../schemas";
import type { VectorRecord } from "../../types";
import { formatDate } from "../../utils/formatters";

const emptyVector: VectorFormData = { name: "", description: "", values: "" };

export default function Vectores() {
  const { vectors, saveVector, removeVector } = useEnterpriseStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VectorRecord | null>(null);
  const [requestError, setRequestError] = useState("");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<VectorFormData>({ resolver: zodResolver(vectorSchema), defaultValues: emptyVector });
  const showCreate = () => { setEditing(null); reset(emptyVector); setOpen(true); };
  const showEdit = (vector: VectorRecord) => { setEditing(vector); reset({ name: vector.name, description: vector.description, values: vector.values.join(", ") }); setOpen(true); };
  const submit = async (data: VectorFormData) => {
    try {
      await saveVector({ id: editing?.id, name: data.name, description: data.description, values: data.values.split(",").map((item) => Number(item.trim())) });
      setOpen(false); setRequestError("");
    } catch (error) { setRequestError(getApiErrorMessage(error)); }
  };
  const remove = async (record: VectorRecord) => {
    if (!window.confirm(`¿Eliminar ${record.name}?`)) return;
    try { await removeVector(record.id); setRequestError(""); }
    catch (error) { setRequestError(getApiErrorMessage(error)); }
  };

  return (
    <div>
      <PageHeader eyebrow="Análisis matemático" title="Vectores" description="Construye representaciones unidimensionales de información empresarial." action={<button onClick={showCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} />Nuevo vector</button>} />
      <section className="p-4 sm:p-6 lg:p-8">
        {requestError && <p role="alert" className="mb-4 text-sm text-rose-700">{requestError}</p>}
        {vectors.length === 0 && <p className="mb-4 text-sm text-slate-500">Aún no hay vectores registrados.</p>}
        <div className="grid gap-5 xl:grid-cols-2">{vectors.map((vector) => <article key={vector.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Sigma size={20} /></div><div><h2 className="font-semibold text-slate-950">{vector.name}</h2><p className="mt-1 text-sm text-slate-500">{vector.description}</p></div></div><div className="flex"><button onClick={() => showEdit(vector)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Edit3 size={17} /></button><button onClick={() => void remove(vector)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={17} /></button></div></div><div className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-sm text-cyan-300"><div className="flex min-w-max gap-3">[ {vector.values.map((value, index) => <span key={`${vector.id}-${index}`} className="rounded bg-white/10 px-2 py-1 text-white">{value}</span>)} ]</div></div><div className="mt-4 flex justify-between text-xs text-slate-400"><span>Dimensión: {vector.values.length}</span><span>{formatDate(vector.createdAt)}</span></div></article>)}</div>
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar vector" : "Nuevo vector"} description="Usa valores numéricos separados por comas." size="lg">
        <form onSubmit={handleSubmit(submit)} className="space-y-4"><label className="block text-sm font-medium text-slate-700">Nombre<input {...register("name")} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" />{errors.name && <span className="text-xs text-rose-600">{errors.name.message}</span>}</label><label className="block text-sm font-medium text-slate-700">Descripción<input {...register("description")} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" />{errors.description && <span className="text-xs text-rose-600">{errors.description.message}</span>}</label><label className="block text-sm font-medium text-slate-700">Valores<textarea {...register("values")} rows={4} placeholder="Valores separados por comas" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono" />{errors.values && <span className="text-xs text-rose-600">{errors.values.message}</span>}</label>{requestError && <p role="alert" className="text-sm text-rose-700">{requestError}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button><button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Guardar vector</button></div></form>
      </Modal>
    </div>
  );
}
