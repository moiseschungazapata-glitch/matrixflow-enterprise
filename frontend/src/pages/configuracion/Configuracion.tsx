import { Save, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { useEnterpriseStore } from "../../hooks/useEnterpriseStore";
import type { AppSettings } from "../../types";

export default function Configuracion() {
  const { settings, updateSettings } = useEnterpriseStore();
  const [form, setForm] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const save = () => { updateSettings(form); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };

  return <div>
    <PageHeader eyebrow="Sistema" title="Configuración" description="Preferencias visuales guardadas en este navegador. Los datos empresariales se guardan mediante la API." />
    <section className="p-4 sm:p-6 lg:p-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3"><SlidersHorizontal size={20} className="text-blue-600" /><h2 className="font-semibold text-slate-950">Preferencias de presentación</h2></div>
        <div className="mt-6 divide-y divide-slate-100">
          <div className="flex items-center justify-between gap-4 py-4"><label htmlFor="currency" className="text-sm font-semibold text-slate-800">Moneda de los importes registrados</label><select id="currency" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value as AppSettings["currency"] }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="PEN">PEN · Soles</option><option value="USD">USD · Dólares</option></select></div>
          <p className="pb-4 text-xs text-slate-500">Este ajuste solo cambia el símbolo mostrado. No convierte importes ni modifica registros.</p>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">{saved && <span className="text-sm text-emerald-700">Preferencias guardadas</span>}<button onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Save size={17} />Guardar preferencias</button></div>
      </div>
    </section>
  </div>;
}
