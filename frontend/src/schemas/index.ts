import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const companySchema = z.object({
  name: z.string().min(3, "Ingresa la razón social"),
  taxId: z.string().regex(/^\d{11}$/, "El RUC debe contener 11 dígitos"),
  sector: z.string().min(3, "Ingresa el sector"),
  email: z.string().email("Ingresa un correo válido"),
  phone: z.string().min(7, "Ingresa un teléfono válido"),
  address: z.string().min(5, "Ingresa una dirección válida"),
  status: z.enum(["Activa", "Inactiva"]),
});

export const branchSchema = z.object({
  companyId: z.number().int().positive("Selecciona una empresa"),
  name: z.string().min(3, "Ingresa el nombre de la sucursal"),
  city: z.string().min(2, "Ingresa la ciudad"),
  address: z.string().min(5, "Ingresa una dirección válida"),
  status: z.enum(["Activa", "Inactiva"]),
});

export const inventoryAdjustmentSchema = z.object({
  stock: z.number().int().min(0, "El stock no puede ser negativo"),
  reason: z.string().min(5, "Describe el motivo del movimiento"),
});

export const productSchema = z.object({
  sku: z.string().min(3, "Ingresa un SKU"),
  name: z.string().min(3, "Ingresa el nombre del producto"),
  category: z.string().min(2, "Ingresa una categoría"),
  price: z.number().positive("El precio debe ser mayor a cero"),
  minimumStock: z.number().int().min(0, "El stock mínimo no puede ser negativo"),
  status: z.enum(["Activo", "Inactivo"]),
});

export const saleSchema = z.object({
  branchId: z.number().int().positive("Selecciona una sucursal"),
  productId: z.number().int().positive("Selecciona un producto"),
  quantity: z.number().int().positive("La cantidad debe ser mayor a cero"),
});

export const vectorSchema = z.object({
  name: z.string().min(3, "Ingresa un nombre"),
  description: z.string().min(3, "Ingresa una descripción"),
  values: z.string().refine(
    (value) => value.split(",").every((item) => item.trim() !== "" && Number.isFinite(Number(item))),
    "Usa números separados por comas",
  ),
});

export const userSchema = z.object({
  name: z.string().min(3, "Ingresa el nombre"),
  email: z.string().email("Ingresa un correo válido"),
  password: z.string()
    .max(128, "La contraseña no puede superar 128 caracteres")
    .refine((value) => value === "" || value.length >= 6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["Administrador", "Analista", "Consulta"]),
  status: z.enum(["Activo", "Inactivo"]),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type CompanyFormData = z.infer<typeof companySchema>;
export type BranchFormData = z.infer<typeof branchSchema>;
export type InventoryAdjustmentFormData = z.infer<typeof inventoryAdjustmentSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type SaleFormData = z.infer<typeof saleSchema>;
export type VectorFormData = z.infer<typeof vectorSchema>;
export type UserFormData = z.infer<typeof userSchema>;
