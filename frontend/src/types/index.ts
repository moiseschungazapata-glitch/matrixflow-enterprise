export type Role = "Administrador" | "Analista" | "Consulta";

export interface CompanyProfile {
  id: number;
  name: string;
  taxId: string;
  sector: string;
  email: string;
  phone: string;
  address: string;
  status: "Activa" | "Inactiva";
}

export interface Branch {
  id: number;
  companyId: number;
  name: string;
  city: string;
  address: string;
  status: "Activa" | "Inactiva";
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  minimumStock: number;
  status: "Activo" | "Inactivo";
}

export interface Sale {
  id: number;
  code: string;
  branchId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  status: "Completada" | "Anulada";
}

export interface InventoryItem {
  id: number;
  branchId: number;
  productId: number;
  stock: number;
  updatedAt: string;
}

export interface InventoryMovement {
  id: number;
  inventoryId: number;
  branchId: number;
  productId: number;
  type: "Entrada" | "Salida" | "Ajuste";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  user: string;
  createdAt: string;
}

export interface VectorRecord {
  id: number;
  name: string;
  description: string;
  values: number[];
  createdAt: string;
}

export interface MatrixRecord {
  id: number;
  name: string;
  description: string;
  values: number[][];
  createdAt: string;
}

export type OperationResult = number | number[] | number[][];

export interface OperationRecord {
  id: number;
  type: string;
  category: "Vector" | "Matriz";
  inputs: string;
  result: OperationResult;
  createdAt: string;
  user: string;
  status: "Completada" | "Error";
}

export interface UserRecord {
  id: number;
  name: string;
  dni: string | null;
  nationality: string | null;
  email: string;
  role: Role;
  status: "Activo" | "Inactivo";
  faceEnrolled: boolean;
  faceEnrolledAt: string | null;
}

export interface AppSettings {
  currency: "PEN" | "USD";
  lowStockNotifications: boolean;
  compactTables: boolean;
}

export interface MockState {
  companies: CompanyProfile[];
  branches: Branch[];
  products: Product[];
  sales: Sale[];
  inventory: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  vectors: VectorRecord[];
  matrices: MatrixRecord[];
  operations: OperationRecord[];
  users: UserRecord[];
  settings: AppSettings;
}
