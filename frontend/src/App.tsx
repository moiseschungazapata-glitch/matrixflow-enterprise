import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import MainLayout from "./components/layout/MainLayout";
import { useAuth } from "./hooks/useAuth";

const Login = lazy(() => import("./pages/auth/Login"));
const Configuracion = lazy(() => import("./pages/configuracion/Configuracion"));
const CombinacionesLineales = lazy(() => import("./pages/matematico/CombinacionesLineales"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const Empresa = lazy(() => import("./pages/empresa/Empresa"));
const Productos = lazy(() => import("./pages/empresa/Productos"));
const Sucursales = lazy(() => import("./pages/empresa/Sucursales"));
const Historial = lazy(() => import("./pages/historial/Historial"));
const Inventario = lazy(() => import("./pages/inventario/Inventario"));
const Matrices = lazy(() => import("./pages/matematico/Matrices"));
const Operaciones = lazy(() => import("./pages/matematico/Operaciones"));
const Vectores = lazy(() => import("./pages/matematico/Vectores"));
const Reportes = lazy(() => import("./pages/reportes/Reportes"));
const Metas = lazy(() => import("./pages/metas/Metas"));
const Usuarios = lazy(() => import("./pages/usuarios/Usuarios"));
const Ventas = lazy(() => import("./pages/ventas/Ventas"));

function PageLoader() {
  return <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-slate-50"><div className="flex items-center gap-3 text-sm font-medium text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />Cargando módulo...</div></div>;
}

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />;
}

function BusinessRoute() {
  const { user } = useAuth();
  return user?.role === "Consulta" ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function AdministratorRoute() {
  const { user } = useAuth();
  return user?.role === "Administrador" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}><Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route element={<BusinessRoute />}>
              <Route path="/empresa" element={<Empresa />} />
              <Route path="/sucursales" element={<Sucursales />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/ventas" element={<Ventas />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/vectores" element={<Vectores />} />
              <Route path="/matrices" element={<Matrices />} />
              <Route path="/operaciones" element={<Operaciones />} />
              <Route path="/combinaciones-lineales" element={<CombinacionesLineales />} />
              <Route path="/historial" element={<Historial />} />
            </Route>
            <Route element={<AdministratorRoute />}>
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/metas" element={<Metas />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes></Suspense>
    </BrowserRouter>
  );
}
