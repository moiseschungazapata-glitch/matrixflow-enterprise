import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BarChart3, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { loginSchema, type LoginFormData } from "../../schemas";
import ThemeToggle from "../../components/common/ThemeToggle";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), defaultValues: { email: "admin@matrixflow.pe", password: "demo123" } });

  const submit = async (data: LoginFormData) => {
    setServerError("");
    try { await login(data.email, data.password); navigate("/dashboard"); }
    catch (error) { setServerError(error instanceof Error ? error.message : "No se pudo iniciar sesión."); }
  };

  return (
    <div className="relative grid min-h-screen bg-white transition-colors lg:grid-cols-2 dark:bg-slate-950">
      <div className="absolute right-5 top-5 z-20"><ThemeToggle /></div>
      <section className="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" /><div className="absolute -bottom-32 left-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-xl font-black">M</div><div><p className="font-bold tracking-[0.16em]">MATRIXFLOW</p><p className="text-xs tracking-[0.24em] text-cyan-400">ENTERPRISE</p></div></div>
        <div className="relative max-w-xl"><div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-cyan-300"><BarChart3 size={25} /></div><h1 className="text-4xl font-bold leading-tight">Convierte tus datos empresariales en decisiones medibles.</h1><p className="mt-5 text-lg leading-8 text-slate-300">Analiza ventas, inventario y metas mediante vectores, matrices e indicadores centralizados.</p><div className="mt-10 grid grid-cols-3 gap-4">{["5 sucursales", "Análisis matricial", "Datos trazables"].map((item) => <div key={item} className="rounded-xl border border-slate-700 bg-white/5 p-4 text-sm text-slate-200">{item}</div>)}</div></div>
        <p className="relative text-xs text-slate-500">MatrixFlow Enterprise · Acceso protegido por FastAPI</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-9 lg:hidden"><p className="font-bold tracking-[0.16em] text-slate-950">MATRIXFLOW</p><p className="text-xs tracking-[0.24em] text-cyan-600">ENTERPRISE</p></div>
          <p className="text-sm font-semibold text-blue-600">Bienvenido</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Inicia sesión</h2><p className="mt-2 text-sm text-slate-500">Accede al panel empresarial con una cuenta registrada.</p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)}>
            <label className="block"><span className="text-sm font-medium text-slate-700">Correo electrónico</span><input {...register("email")} type="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />{errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email.message}</span>}</label>
            <label className="block"><span className="text-sm font-medium text-slate-700">Contraseña</span><div className="relative mt-2"><input {...register("password")} type={showPassword ? "text" : "password"} className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /><button type="button" className="absolute right-3 top-3 text-slate-400" onClick={() => setShowPassword((value) => !value)} aria-label="Mostrar contraseña">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>{errors.password && <span className="mt-1 block text-xs text-rose-600">{errors.password.message}</span>}</label>
            {serverError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{serverError}</p>}
            <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60">{isSubmitting ? "Validando..." : "Ingresar"}<ArrowRight size={17} /></button>
          </form>
          <div className="mt-7 rounded-xl border border-blue-100 bg-blue-50/70 p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 text-blue-600" size={19} /><div><p className="text-sm font-semibold text-slate-800">Cuenta de desarrollo</p><p className="mt-1 text-xs leading-5 text-slate-600">admin@matrixflow.pe · demo123</p><button type="button" className="mt-2 text-xs font-semibold text-blue-700" onClick={() => { setValue("email", "admin@matrixflow.pe"); setValue("password", "demo123"); }}>Usar credenciales</button></div></div></div>
        </div>
      </section>
    </div>
  );
}
