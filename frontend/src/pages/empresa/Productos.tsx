import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useEnterpriseStore } from "../../hooks/useEnterpriseStore";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../services/api/enterprise";
import { productSchema, type ProductFormData } from "../../schemas";
import type { Product } from "../../types";
import { formatCurrency } from "../../utils/formatters";

const emptyProduct: ProductFormData = { sku: "", name: "", category: "", price: 0, minimumStock: 0, status: "Activo" };

export default function Productos() {
  const { products, inventory, settings, saveProduct, removeProduct } = useEnterpriseStore();
  const { user } = useAuth();
  const canEdit = user?.role === "Administrador";
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>({ resolver: zodResolver(productSchema), defaultValues: emptyProduct });
  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const showCreate = () => { setEditing(null); reset(emptyProduct); setOpen(true); };
  const showEdit = (product: Product) => { setEditing(product); reset(product); setOpen(true); };
  const submit = async (data: ProductFormData) => { try { await saveProduct({ ...data, id: editing?.id }); setOpen(false); setMessage(editing ? "Producto actualizado." : "Producto registrado."); } catch (error) { setMessage(getApiErrorMessage(error)); } };
  const remove = async (product: Product) => { if (!window.confirm(`¿Eliminar ${product.name}?`)) return; try { await removeProduct(product.id); setMessage("Producto eliminado."); } catch (error) { setMessage(getApiErrorMessage(error)); } };

  return (
    <div>
      <PageHeader eyebrow="Empresa" title="Productos" description="Catálogo, categorías, precios y niveles mínimos de stock." action={canEdit ? <button onClick={showCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} />Nuevo producto</button> : undefined} />
      <section className="space-y-5 p-4 sm:p-6 lg:p-8">
        {message && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}
        {products.length === 0 && <p className="text-sm text-slate-500">Aún no hay productos registrados.</p>}
        <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto, SKU o categoría" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500" /></div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Producto</th><th className="px-5 py-4">Categoría</th><th className="px-5 py-4">Precio</th><th className="px-5 py-4">Stock total</th><th className="px-5 py-4">Estado</th>{canEdit && <th className="px-5 py-4 text-right">Acciones</th>}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((product) => <tr key={product.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{product.name}</p><p className="text-xs text-slate-400">{product.sku}</p></td><td className="px-5 py-4 text-slate-600">{product.category}</td><td className="px-5 py-4 font-medium text-slate-800">{formatCurrency(product.price, settings.currency)}</td><td className="px-5 py-4 text-slate-600">{inventory.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.stock, 0)} und.</td><td className="px-5 py-4"><StatusBadge label={product.status} /></td>{canEdit && <td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => showEdit(product)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"><Edit3 size={17} /></button><button onClick={() => remove(product)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={17} /></button></div></td>}</tr>)}</tbody></table></div></div>
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar producto" : "Nuevo producto"} size="lg">
        <form onSubmit={handleSubmit(submit)} className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">SKU<input {...register("sku")} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" />{errors.sku && <span className="text-xs text-rose-600">{errors.sku.message}</span>}</label>
          <label className="block text-sm font-medium text-slate-700">Nombre<input {...register("name")} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" />{errors.name && <span className="text-xs text-rose-600">{errors.name.message}</span>}</label>
          <label className="block text-sm font-medium text-slate-700">Categoría<input {...register("category")} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" />{errors.category && <span className="text-xs text-rose-600">{errors.category.message}</span>}</label>
          <label className="block text-sm font-medium text-slate-700">Precio<input {...register("price", { valueAsNumber: true })} type="number" step="0.01" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" />{errors.price && <span className="text-xs text-rose-600">{errors.price.message}</span>}</label>
          <label className="block text-sm font-medium text-slate-700">Stock mínimo<input {...register("minimumStock", { valueAsNumber: true })} type="number" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" />{errors.minimumStock && <span className="text-xs text-rose-600">{errors.minimumStock.message}</span>}</label>
          <label className="block text-sm font-medium text-slate-700">Estado<select {...register("status")} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5"><option>Activo</option><option>Inactivo</option></select></label>
          <div className="flex justify-end gap-3 pt-3 md:col-span-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button><button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Guardar producto</button></div>
        </form>
      </Modal>
    </div>
  );
}
