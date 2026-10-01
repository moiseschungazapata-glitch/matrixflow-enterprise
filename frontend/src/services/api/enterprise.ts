import axios from "axios";
import { apiClient } from "./client";
import type {
  Branch, CompanyProfile, InventoryItem, InventoryMovement, MatrixRecord,
  OperationRecord, Product, Sale, TargetRecord, VectorRecord,
} from "../../types";

export interface ReportData {
  totalSales: number;
  unitsSold: number;
  operationsCount: number;
  salesByBranch: { name: string; sales: number; units: number }[];
  stockByProduct: { name: string; stock: number; minimum: number }[];
}

export interface EnterpriseData {
  companies: CompanyProfile[];
  branches: Branch[];
  products: Product[];
  sales: Sale[];
  inventory: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  vectors: VectorRecord[];
  matrices: MatrixRecord[];
  operations: OperationRecord[];
  targets: TargetRecord[];
  report: ReportData | null;
}

export const emptyEnterpriseData: EnterpriseData = {
  companies: [], branches: [], products: [], sales: [], inventory: [],
  inventoryMovements: [], vectors: [], matrices: [], operations: [], targets: [], report: null,
};

async function listAll<T>(path: string): Promise<T[]> {
  const records: T[] = [];
  const limit = 500;
  for (let offset = 0; ; offset += limit) {
    const response = await apiClient.get<T[]>(path, { params: { offset, limit } });
    records.push(...response.data);
    if (response.data.length < limit) return records;
  }
}

export async function loadEnterpriseData(readOnly: boolean): Promise<EnterpriseData> {
  const report = (await apiClient.get<ReportData>("/reports")).data;
  if (readOnly) return { ...emptyEnterpriseData, report };
  const [companies, branches, products, sales, inventory, inventoryMovements,
    vectors, matrices, operations, targets] = await Promise.all([
    listAll<CompanyProfile>("/companies"),
    listAll<Branch>("/branches"),
    listAll<Product>("/products"),
    listAll<Sale>("/sales"),
    listAll<InventoryItem>("/inventory"),
    listAll<InventoryMovement>("/inventory/movements"),
    listAll<VectorRecord>("/vectors"),
    listAll<MatrixRecord>("/matrices"),
    listAll<OperationRecord>("/operations"),
    listAll<TargetRecord>("/targets"),
  ]);
  return { companies, branches, products, sales, inventory, inventoryMovements,
    vectors, matrices, operations, targets, report };
}

export async function saveRecord<T extends { id?: number }>(
  path: string, record: T,
): Promise<void> {
  const { id, ...values } = record;
  const body = { ...values } as Record<string, unknown>;
  delete body.createdAt;
  if (id) await apiClient.patch(`${path}/${id}`, body);
  else await apiClient.post(path, body);
}

export async function deleteRecord(path: string, id: number): Promise<void> {
  await apiClient.delete(`${path}/${id}`);
}

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : "No se pudo completar la operación.";
  if (!error.response) return "No se pudo conectar con la API. Revisa la conexión y VITE_API_URL.";
  const detail: unknown = error.response.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg).filter(Boolean).join(" ") || "Datos inválidos.";
  return `La API devolvió el estado ${error.response.status}.`;
}
