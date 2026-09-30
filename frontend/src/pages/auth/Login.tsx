import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  IdCard,
  LoaderCircle,
  LockKeyhole,
  ScanFace,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../../components/common/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import {
  dniLoginSchema,
  loginSchema,
  type DniLoginFormData,
  type LoginFormData,
} from "../../schemas";

type AccessMode = "dni" | "legacy";
type DniStep = "identify" | "profile" | "face";
type CameraStatus = "off" | "starting" | "ready" | "error";
type FaceStatus = "pending" | "verifying" | "verified";

const demoProfile = {
  fullName: "Ana Torres Mendoza",
  nationality: "Peruana",
  role: "Administrador",
};

const steps: { id: DniStep; label: string }[] = [
  { id: "identify", label: "DNI" },
  { id: "profile", label: "Perfil" },
  { id: "face", label: "Rostro" },
];

const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

export default function Login() {
  const [accessMode, setAccessMode] = useState<AccessMode>("dni");
  const [dniStep, setDniStep] = useState<DniStep>("identify");
  const [identifiedDni, setIdentifiedDni] = useState("");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("off");
  const [cameraError, setCameraError] = useState("");
  const [faceStatus, setFaceStatus] = useState<FaceStatus>("pending");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const verificationTimerRef = useRef<number | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register: registerDni,
    handleSubmit: handleDniSubmit,
    reset: resetDni,
    formState: { errors: dniErrors },
  } = useForm<DniLoginFormData>({
    resolver: zodResolver(dniLoginSchema),
    defaultValues: { dni: "" },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("off");
  }, []);

  useEffect(() => {
    if (cameraStatus === "ready" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraStatus]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (verificationTimerRef.current !== null) window.clearTimeout(verificationTimerRef.current);
  }, []);

  const identify = ({ dni }: DniLoginFormData) => {
    setIdentifiedDni(dni);
    setDniStep("profile");
  };

  const startCamera = async () => {
    setCameraError("");
    setCameraStatus("starting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      setCameraError("Este navegador no permite acceder a la cámara.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraStatus("ready");
    } catch {
      setCameraStatus("error");
      setCameraError("No se pudo activar la cámara. Revisa el permiso del navegador e inténtalo nuevamente.");
    }
  };

  const simulateVerification = () => {
    if (cameraStatus !== "ready") return;
    setFaceStatus("verifying");
    verificationTimerRef.current = window.setTimeout(() => {
      stopCamera();
      setFaceStatus("verified");
      verificationTimerRef.current = null;
    }, 1800);
  };

  const returnToDni = () => {
    stopCamera();
    setDniStep("identify");
    setFaceStatus("pending");
    setIdentifiedDni("");
    setCameraError("");
    resetDni({ dni: "" });
  };

  const showLegacyAccess = () => {
    stopCamera();
    setAccessMode("legacy");
    setServerError("");
  };

  const submitLegacyLogin = async (data: LoginFormData) => {
    setServerError("");
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    }
  };

  const currentStepIndex = steps.findIndex((step) => step.id === dniStep);
  const maskedDni = identifiedDni ? `••••${identifiedDni.slice(-4)}` : "";

  return (
    <div className="relative grid min-h-screen bg-white transition-colors lg:grid-cols-2 dark:bg-slate-950">
      <div className="absolute right-5 top-5 z-30"><ThemeToggle /></div>

      <section className="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-32 left-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-xl font-black">M</div>
          <div><p className="font-bold tracking-[0.16em]">MATRIXFLOW</p><p className="text-xs tracking-[0.24em] text-cyan-400">ENTERPRISE</p></div>
        </div>

        <div className="relative max-w-xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-cyan-300"><ScanFace size={27} /></div>
          <h1 className="text-4xl font-bold leading-tight">Tu identidad, protegida en cada acceso.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">Identificación por DNI y verificación facial para acceder de forma simple y segura a la información empresarial.</p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {["Acceso por DNI", "Verificación facial", "Datos protegidos"].map((item) => <div key={item} className="rounded-xl border border-slate-700 bg-white/5 p-4 text-sm text-slate-200">{item}</div>)}
          </div>
        </div>

        <p className="relative text-xs text-slate-500">MatrixFlow Enterprise · Prototipo de identidad segura</p>
      </section>

      <section className="flex items-center justify-center px-5 py-20 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="font-bold tracking-[0.16em] text-slate-950">MATRIXFLOW</p>
            <p className="text-xs tracking-[0.24em] text-cyan-600">ENTERPRISE</p>
          </div>

          {accessMode === "legacy" ? (
            <LegacyLogin
              register={register}
              errors={errors}
              isSubmitting={isSubmitting}
              showPassword={showPassword}
              serverError={serverError}
              onTogglePassword={() => setShowPassword((value) => !value)}
              onSubmit={handleSubmit(submitLegacyLogin)}
              onBack={() => { setAccessMode("dni"); setServerError(""); }}
            />
          ) : (
            <>
              <div className="mb-8">
                <div className="mb-5 flex items-center justify-between">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition ${index <= currentStepIndex ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}
                          aria-current={step.id === dniStep ? "step" : undefined}
                        >
                          {index < currentStepIndex ? <CheckCircle2 size={17} /> : index + 1}
                        </span>
                        <span className={`text-[11px] font-medium ${index <= currentStepIndex ? "text-blue-600" : "text-slate-400"}`}>{step.label}</span>
                      </div>
                      {index < steps.length - 1 && <div className={`mx-2 mb-5 h-0.5 flex-1 ${index < currentStepIndex ? "bg-blue-600" : "bg-slate-200"}`} />}
                    </div>
                  ))}
                </div>

                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <ShieldCheck size={14} />Prototipo visual
                </div>
              </div>

              {dniStep === "identify" && (
                <div>
                  <p className="text-sm font-semibold text-blue-600">Bienvenido</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Ingresa tu DNI</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Usaremos este número únicamente para localizar tu cuenta registrada.</p>

                  <form className="mt-8" onSubmit={handleDniSubmit(identify)}>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Número de DNI</span>
                      <div className="relative mt-2">
                        <IdCard className="absolute left-4 top-3.5 text-slate-400" size={19} />
                        <input
                          {...registerDni("dni", {
                            onChange: (event) => {
                              event.target.value = event.target.value.replace(/\D/g, "").slice(0, 8);
                            },
                          })}
                          inputMode="numeric"
                          maxLength={8}
                          autoComplete="off"
                          placeholder="Ej. 12345678"
                          className={`${inputClass} pl-12 tracking-[0.18em]`}
                          autoFocus
                        />
                      </div>
                      {dniErrors.dni && <span className="mt-1 block text-xs text-rose-600">{dniErrors.dni.message}</span>}
                    </label>

                    <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
                      Continuar<ArrowRight size={17} />
                    </button>
                  </form>

                  <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-5 text-slate-600">
                    Para revisar este diseño puedes usar cualquier número de ocho dígitos. Todavía no se consulta Supabase.
                  </div>
                </div>
              )}

              {dniStep === "profile" && (
                <div>
                  <button type="button" onClick={returnToDni} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600"><ArrowLeft size={16} />Cambiar DNI</button>
                  <p className="text-sm font-semibold text-blue-600">Cuenta localizada</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Confirma tus datos</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Revisa que la información corresponda contigo antes de verificar tu identidad.</p>

                  <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 p-5">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-lg font-bold text-white">AT</div>
                      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Perfil encontrado</p><h3 className="mt-1 font-semibold text-slate-950">{demoProfile.fullName}</h3></div>
                    </div>
                    <dl className="space-y-4 p-5 text-sm">
                      <div className="flex items-center gap-3"><IdCard className="text-slate-400" size={18} /><div><dt className="text-xs text-slate-500">DNI</dt><dd className="mt-0.5 font-semibold text-slate-800">{maskedDni}</dd></div></div>
                      <div className="flex items-center gap-3"><Globe2 className="text-slate-400" size={18} /><div><dt className="text-xs text-slate-500">Nacionalidad</dt><dd className="mt-0.5 font-semibold text-slate-800">{demoProfile.nationality}</dd></div></div>
                      <div className="flex items-center gap-3"><UserCog className="text-slate-400" size={18} /><div><dt className="text-xs text-slate-500">Rol de acceso</dt><dd className="mt-0.5 font-semibold text-slate-800">{demoProfile.role}</dd></div></div>
                    </dl>
                  </div>

                  <button type="button" onClick={() => setDniStep("face")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
                    Verificar mi identidad<ScanFace size={18} />
                  </button>
                </div>
              )}

              {dniStep === "face" && (
                <div>
                  {faceStatus !== "verified" && <button type="button" onClick={() => { stopCamera(); setDniStep("profile"); setCameraError(""); }} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600"><ArrowLeft size={16} />Volver al perfil</button>}
                  <p className="text-sm font-semibold text-blue-600">Último paso</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Verificación facial</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Coloca tu rostro dentro del marco y mantén una iluminación uniforme.</p>

                  <div className="relative mt-7 aspect-square max-h-[350px] w-full overflow-hidden rounded-3xl bg-slate-950 shadow-xl">
                    {cameraStatus === "ready" && faceStatus !== "verified" && <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover [transform:scaleX(-1)]" />}

                    {(cameraStatus === "off" || cameraStatus === "error") && faceStatus !== "verified" && (
                      <div className="absolute inset-0 grid place-items-center p-8 text-center">
                        <div><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-cyan-300"><Camera size={30} /></div><p className="mt-4 text-sm font-medium text-white">La cámara está desactivada</p><p className="mt-2 text-xs leading-5 text-slate-400">La vista previa permanece solamente en este dispositivo.</p></div>
                      </div>
                    )}

                    {cameraStatus === "starting" && <div className="absolute inset-0 grid place-items-center text-center text-white"><div><LoaderCircle className="mx-auto animate-spin text-cyan-300" size={30} /><p className="mt-3 text-sm">Solicitando permiso...</p></div></div>}

                    {faceStatus === "verifying" && <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/75 text-center text-white backdrop-blur-sm"><div><ScanFace className="mx-auto animate-pulse text-cyan-300" size={42} /><p className="mt-4 font-semibold">Comparando identidad...</p><p className="mt-1 text-xs text-slate-400">Simulación del flujo visual</p></div></div>}

                    {faceStatus === "verified" && <div className="absolute inset-0 z-20 grid place-items-center bg-emerald-950/90 p-8 text-center text-white"><div><CheckCircle2 className="mx-auto text-emerald-300" size={58} /><h3 className="mt-5 text-xl font-bold">Identidad verificada</h3><p className="mt-2 text-sm leading-6 text-emerald-100/80">La coincidencia visual se completó correctamente.</p></div></div>}

                    {cameraStatus === "ready" && faceStatus === "pending" && <div className="pointer-events-none absolute inset-[12%] rounded-[42%] border-2 border-cyan-300/80 shadow-[0_0_0_999px_rgba(2,6,23,0.28)]"><span className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-3xl border-l-4 border-t-4 border-white" /><span className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-3xl border-r-4 border-t-4 border-white" /><span className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-3xl border-b-4 border-l-4 border-white" /><span className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-3xl border-b-4 border-r-4 border-white" /></div>}
                  </div>

                  {cameraError && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{cameraError}</p>}

                  {faceStatus === "pending" && cameraStatus !== "ready" && (
                    <button type="button" onClick={startCamera} disabled={cameraStatus === "starting"} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"><Camera size={18} />Activar cámara</button>
                  )}

                  {faceStatus === "pending" && cameraStatus === "ready" && (
                    <button type="button" onClick={simulateVerification} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"><ScanFace size={18} />Probar verificación visual</button>
                  )}

                  {faceStatus === "verified" && (
                    <div className="mt-5">
                      <button disabled className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white opacity-60"><LockKeyhole size={17} />Continuar al dashboard</button>
                      <p className="mt-3 text-center text-xs leading-5 text-slate-500">Este botón se habilitará cuando conectemos la validación biométrica real con FastAPI.</p>
                    </div>
                  )}

                  <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">Esta demostración no analiza, captura ni almacena imágenes.</p>
                </div>
              )}

              <div className="mt-8 border-t border-slate-200 pt-5 text-center">
                <button type="button" onClick={showLegacyAccess} className="text-sm font-semibold text-blue-700 hover:text-blue-800">Ingresar temporalmente con correo y contraseña</button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

interface LegacyLoginProps {
  register: ReturnType<typeof useForm<LoginFormData>>["register"];
  errors: ReturnType<typeof useForm<LoginFormData>>["formState"]["errors"];
  isSubmitting: boolean;
  showPassword: boolean;
  serverError: string;
  onTogglePassword: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onBack: () => void;
}

function LegacyLogin({ register, errors, isSubmitting, showPassword, serverError, onTogglePassword, onSubmit, onBack }: LegacyLoginProps) {
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600"><ArrowLeft size={16} />Volver al acceso por DNI</button>
      <p className="text-sm font-semibold text-blue-600">Acceso temporal</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Correo y contraseña</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Usa tus credenciales actuales mientras completamos la integración biométrica.</p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Correo electrónico</span>
          <input {...register("email")} type="email" className={`mt-2 ${inputClass}`} autoComplete="email" />
          {errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email.message}</span>}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Contraseña</span>
          <div className="relative mt-2">
            <input {...register("password")} type={showPassword ? "text" : "password"} className={`${inputClass} pr-11`} autoComplete="current-password" />
            <button type="button" className="absolute right-3 top-3 text-slate-400" onClick={onTogglePassword} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
          </div>
          {errors.password && <span className="mt-1 block text-xs text-rose-600">{errors.password.message}</span>}
        </label>

        {serverError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{serverError}</p>}

        <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60">
          {isSubmitting ? "Validando..." : "Ingresar"}<ArrowRight size={17} />
        </button>
      </form>

      <div className="mt-7 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
        <div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={19} /><div><p className="text-sm font-semibold text-slate-800">Acceso funcional conservado</p><p className="mt-1 text-xs leading-5 text-slate-600">Este formulario continúa conectado a FastAPI y Supabase.</p></div></div>
      </div>
    </div>
  );
}
