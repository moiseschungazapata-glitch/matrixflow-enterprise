import { AlertCircle, CheckCircle2, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { useEnterpriseStore } from "../../hooks/useEnterpriseStore";
import { getApiErrorMessage } from "../../services/api/enterprise";
import type { OperationResult } from "../../types";
import { formatResult } from "../../utils/formatters";

const vectorOperations = ["Suma", "Resta", "Producto escalar", "Multiplicación por escalar", "Combinación lineal"];
const matrixOperations = ["Suma", "Resta", "Multiplicación", "Transposición", "Multiplicación por escalar"];

export default function Operaciones() {
  const { vectors, matrices, executeOperation } = useEnterpriseStore();
  const [category, setCategory] = useState<"Vector" | "Matriz">("Vector");
  const [operation, setOperation] = useState("Suma");
  const [firstId, setFirstId] = useState(0);
  const [secondId, setSecondId] = useState(0);
  const [scalar, setScalar] = useState(2);
  const [coefficientB, setCoefficientB] = useState(1);
  const [result, setResult] = useState<OperationResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const options = category === "Vector" ? vectors : matrices;
  const needsSecond = operation !== "Multiplicación por escalar" && operation !== "Transposición";
  const reset = () => { setResult(null); setError(""); setScalar(2); setCoefficientB(1); };
  const changeCategory = (next: "Vector" | "Matriz") => { setCategory(next); setOperation("Suma"); setFirstId(next === "Vector" ? (vectors[0]?.id ?? 0) : (matrices[0]?.id ?? 0)); setSecondId(next === "Vector" ? (vectors[1]?.id ?? 0) : (matrices[1]?.id ?? 0)); setResult(null); setError(""); };

  const execute = async () => {
    setError("");
    setBusy(true);
    try {
      const selectedFirst = firstId || options[0]?.id;
      const selectedSecond = secondId || options[1]?.id || options[0]?.id;
      if (!selectedFirst || (needsSecond && !selectedSecond)) throw new Error("Registra los operandos antes de ejecutar el cálculo.");
      const saved = await executeOperation({
        category,
        operationType: operation,
        firstId: selectedFirst,
        ...(needsSecond ? { secondId: selectedSecond } : {}),
        ...(["Multiplicación por escalar", "Combinación lineal"].includes(operation) ? { scalar } : {}),
        ...(operation === "Combinación lineal" ? { coefficientB } : {}),
      });
      setResult(saved.result);
    } catch (caught) {
      setResult(null);
      setError(getApiErrorMessage(caught));
    } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader eyebrow="Motor matemático" title="Operaciones" description="Ejecuta cálculos con NumPy y guarda sus resultados en la base de datos." />
      <section className="p-4 sm:p-6 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex rounded-xl bg-slate-100 p-1"><button onClick={() => changeCategory("Vector")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${category === "Vector" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Vectores</button><button onClick={() => changeCategory("Matriz")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${category === "Matriz" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Matrices</button></div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 md:col-span-2">Operación<select value={operation} onChange={(event) => { setOperation(event.target.value); setResult(null); setError(""); }} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5">{(category === "Vector" ? vectorOperations : matrixOperations).map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">{category === "Vector" ? "Vector A" : "Matriz A"}<select value={firstId || options[0]?.id || 0} onChange={(event) => setFirstId(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5">{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              {needsSecond && <label className="text-sm font-medium text-slate-700">{category === "Vector" ? "Vector B" : "Matriz B"}<select value={secondId || options[1]?.id || options[0]?.id || 0} onChange={(event) => setSecondId(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5">{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
              {(operation === "Multiplicación por escalar" || operation === "Combinación lineal") && <label className="text-sm font-medium text-slate-700">{operation === "Combinación lineal" ? "Coeficiente A" : "Escalar"}<input value={scalar} onChange={(event) => setScalar(Number(event.target.value))} type="number" step="any" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" /></label>}
              {operation === "Combinación lineal" && <label className="text-sm font-medium text-slate-700">Coeficiente B<input value={coefficientB} onChange={(event) => setCoefficientB(Number(event.target.value))} type="number" step="any" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" /></label>}
            </div>
            {error && <div className="mt-5 flex gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle size={19} className="shrink-0" />{error}</div>}
            <div className="mt-6 flex gap-3"><button onClick={() => void execute()} disabled={busy || options.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"><Play size={17} />{busy ? "Calculando..." : "Ejecutar operación"}</button><button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600"><RotateCcw size={16} />Limpiar</button></div>
          </div>
          <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-300">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-400">Resultado</p>
            {result !== null ? <div className="mt-5"><div className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={18} />Resultado guardado</div><pre className="mt-5 overflow-x-auto whitespace-pre rounded-xl bg-white/5 p-5 font-mono text-lg leading-9 text-white">{formatResult(result)}</pre></div> : <div className="flex min-h-64 items-center justify-center text-center"><div><Play className="mx-auto text-slate-600" size={34} /><p className="mt-4 text-sm text-slate-400">Configura y ejecuta una operación<br />para visualizar el resultado.</p></div></div>}
          </div>
        </div>
      </section>
    </div>
  );
}
