import { Edit3, Grid3X3, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import { useEnterpriseStore } from "../../hooks/useEnterpriseStore";
import { getApiErrorMessage } from "../../services/api/enterprise";
import type { MatrixRecord } from "../../types";
import { formatDate } from "../../utils/formatters";

const createGrid = (rows: number, columns: number, existing?: number[][]) => Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => existing?.[row]?.[column] ?? 0));

export default function Matrices() {
  const { matrices, saveMatrix, removeMatrix } = useEnterpriseStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MatrixRecord | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [values, setValues] = useState<number[][]>(createGrid(3, 3));
  const [error, setError] = useState("");
  const showCreate = () => { setEditing(null); setName(""); setDescription(""); setRows(3); setColumns(3); setValues(createGrid(3, 3)); setError(""); setOpen(true); };
  const showEdit = (matrix: MatrixRecord) => { setEditing(matrix); setName(matrix.name); setDescription(matrix.description); setRows(matrix.values.length); setColumns(matrix.values[0].length); setValues(matrix.values); setError(""); setOpen(true); };
  const resize = (nextRows: number, nextColumns: number) => { const safeRows = Math.min(6, Math.max(1, nextRows)); const safeColumns = Math.min(6, Math.max(1, nextColumns)); setRows(safeRows); setColumns(safeColumns); setValues((current) => createGrid(safeRows, safeColumns, current)); };
  const updateCell = (row: number, column: number, value: number) => setValues((current) => current.map((currentRow, rowIndex) => rowIndex === row ? currentRow.map((cell, columnIndex) => columnIndex === column ? value : cell) : currentRow));
  const save = async () => {
    if (name.trim().length < 3 || description.trim().length < 3) { setError("Completa el nombre y la descripción."); return; }
    try {
      await saveMatrix({ id: editing?.id, name, description, values });
      setOpen(false); setError("");
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  };
  const remove = async (record: MatrixRecord) => {
    if (!window.confirm(`¿Eliminar ${record.name}?`)) return;
    try { await removeMatrix(record.id); setError(""); }
    catch (requestError) { setError(getApiErrorMessage(requestError)); }
  };

  return (
    <div>
      <PageHeader eyebrow="Análisis matemático" title="Matrices" description="Organiza información multidimensional por sucursal, producto o período." action={<button onClick={showCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} />Nueva matriz</button>} />
      <section className="p-4 sm:p-6 lg:p-8">{error && !open && <p role="alert" className="mb-4 text-sm text-rose-700">{error}</p>}{matrices.length === 0 && <p className="mb-4 text-sm text-slate-500">Aún no hay matrices registradas.</p>}<div className="grid gap-5 xl:grid-cols-2">{matrices.map((matrix) => <article key={matrix.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><Grid3X3 size={20} /></div><div><h2 className="font-semibold text-slate-950">{matrix.name}</h2><p className="mt-1 text-sm text-slate-500">{matrix.description}</p></div></div><div className="flex"><button onClick={() => showEdit(matrix)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Edit3 size={17} /></button><button onClick={() => void remove(matrix)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={17} /></button></div></div><div className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-4"><div className="inline-grid gap-2" style={{ gridTemplateColumns: `repeat(${matrix.values[0].length}, minmax(48px, 1fr))` }}>{matrix.values.flatMap((row, rowIndex) => row.map((value, columnIndex) => <span key={`${rowIndex}-${columnIndex}`} className="rounded-lg bg-white/10 px-3 py-2 text-center font-mono text-sm text-white">{value}</span>))}</div></div><div className="mt-4 flex justify-between text-xs text-slate-400"><span>{matrix.values.length} × {matrix.values[0].length}</span><span>{formatDate(matrix.createdAt)}</span></div></article>)}</div></section>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar matriz" : "Nueva matriz"} description="Define dimensiones de hasta 6 × 6 y completa cada celda." size="xl">
        <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">Nombre<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" /></label><label className="text-sm font-medium text-slate-700">Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5" /></label></div>
        <div className="mt-5 flex gap-4"><label className="text-sm font-medium text-slate-700">Filas<input value={rows} onChange={(event) => resize(Number(event.target.value), columns)} type="number" min="1" max="6" className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-1.5" /></label><label className="text-sm font-medium text-slate-700">Columnas<input value={columns} onChange={(event) => resize(rows, Number(event.target.value))} type="number" min="1" max="6" className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-1.5" /></label></div>
        <div className="mt-5 overflow-x-auto rounded-xl bg-slate-50 p-4"><div className="inline-grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(72px, 1fr))` }}>{values.flatMap((row, rowIndex) => row.map((value, columnIndex) => <input key={`${rowIndex}-${columnIndex}`} value={value} onChange={(event) => updateCell(rowIndex, columnIndex, Number(event.target.value))} type="number" step="any" className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-center font-mono text-sm outline-none focus:border-blue-500" aria-label={`Fila ${rowIndex + 1}, columna ${columnIndex + 1}`} />))}</div></div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}<div className="mt-5 flex justify-end gap-3"><button onClick={() => setOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button><button onClick={() => void save()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Guardar matriz</button></div>
      </Modal>
    </div>
  );
}
