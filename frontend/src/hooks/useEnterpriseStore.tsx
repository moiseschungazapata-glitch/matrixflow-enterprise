/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { apiClient } from "../services/api/client";
import { deleteRecord, emptyEnterpriseData, getApiErrorMessage, loadEnterpriseData, saveRecord, type EnterpriseData } from "../services/api/enterprise";
import type { AppSettings, Branch, CompanyProfile, InventoryItem, MatrixRecord, OperationRecord, Product, Sale, TargetRecord, VectorRecord } from "../types";

type Input<T> = Omit<T, "id" | "createdAt"> & { id?: number };
type OperationInput = { category: "Vector" | "Matriz"; operationType: string; firstId: number; secondId?: number; scalar?: number; coefficientB?: number };

interface EnterpriseStoreValue extends EnterpriseData {
  isLoading: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  settings: AppSettings;
  updateSettings: (settings: AppSettings) => void;
  saveCompany: (record: Input<CompanyProfile>) => Promise<void>;
  removeCompany: (id: number) => Promise<void>;
  saveBranch: (record: Input<Branch>) => Promise<void>;
  removeBranch: (id: number) => Promise<void>;
  saveProduct: (record: Input<Product>) => Promise<void>;
  removeProduct: (id: number) => Promise<void>;
  addSale: (record: Pick<Sale, "branchId" | "productId" | "quantity">) => Promise<Sale>;
  createInventory: (record: Pick<InventoryItem, "branchId" | "productId" | "stock">) => Promise<void>;
  adjustInventory: (id: number, stock: number, reason: string) => Promise<void>;
  saveVector: (record: Input<VectorRecord>) => Promise<void>;
  removeVector: (id: number) => Promise<void>;
  saveMatrix: (record: Input<MatrixRecord>) => Promise<void>;
  removeMatrix: (id: number) => Promise<void>;
  executeOperation: (record: OperationInput) => Promise<OperationRecord>;
  saveTarget: (record: Input<TargetRecord>) => Promise<void>;
  removeTarget: (id: number) => Promise<void>;
}

const SETTINGS_KEY = "matrixflow_ui_settings";
const defaultSettings: AppSettings = { currency: "PEN" };
const EnterpriseStoreContext = createContext<EnterpriseStoreValue | null>(null);

function readSettings(): AppSettings {
  try {
    return { ...defaultSettings, ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return defaultSettings;
  }
}

export function EnterpriseStoreProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["enterprise", user?.id, user?.role];
  const query = useQuery({
    queryKey,
    enabled: isAuthenticated,
    queryFn: () => loadEnterpriseData(user?.role === "Consulta"),
  });
  const [settings, setSettings] = useState(readSettings);
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey }); };
  const change = async (work: () => Promise<unknown>) => { await work(); await refresh(); };
  const data = query.data ?? emptyEnterpriseData;

  const value = useMemo<EnterpriseStoreValue>(() => ({
    ...data,
    isLoading: query.isLoading,
    loadError: query.error ? getApiErrorMessage(query.error) : null,
    refresh,
    settings,
    updateSettings: (next) => { setSettings(next); window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); },
    saveCompany: (record) => change(() => saveRecord("/companies", record)),
    removeCompany: (id) => change(() => deleteRecord("/companies", id)),
    saveBranch: (record) => change(() => saveRecord("/branches", record)),
    removeBranch: (id) => change(() => deleteRecord("/branches", id)),
    saveProduct: (record) => change(() => saveRecord("/products", record)),
    removeProduct: (id) => change(() => deleteRecord("/products", id)),
    addSale: async (record) => {
      const response = await apiClient.post<Sale>("/sales", record);
      await refresh();
      return response.data;
    },
    createInventory: (record) => change(() => apiClient.post("/inventory", record)),
    adjustInventory: (id, stock, reason) => change(() => apiClient.patch(`/inventory/${id}`, { stock, reason })),
    saveVector: (record) => change(() => saveRecord("/vectors", record)),
    removeVector: (id) => change(() => deleteRecord("/vectors", id)),
    saveMatrix: (record) => change(() => saveRecord("/matrices", record)),
    removeMatrix: (id) => change(() => deleteRecord("/matrices", id)),
    executeOperation: async (record) => {
      const response = await apiClient.post<OperationRecord>("/operations", record);
      await refresh();
      return response.data;
    },
    saveTarget: (record) => change(() => saveRecord("/targets", record)),
    removeTarget: (id) => change(() => deleteRecord("/targets", id)),
  // refresh is tied to the current user query key and recreated on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, query.isLoading, query.error, settings, queryClient, user?.id, user?.role]);

  return <EnterpriseStoreContext.Provider value={value}>{children}</EnterpriseStoreContext.Provider>;
}

export function useEnterpriseStore() {
  const context = useContext(EnterpriseStoreContext);
  if (!context) throw new Error("useEnterpriseStore requiere EnterpriseStoreProvider");
  return context;
}
