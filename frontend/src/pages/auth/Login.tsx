import { zodResolver } from "@hookform/resolvers/zod";
import { FaceLivenessDetector } from "@aws-amplify/ui-react-liveness";
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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../../components/common/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import {
  completeFaceLivenessSession,
  createFaceLivenessSession,
  getFaceVerificationErrorMessage,
  getIdentificationErrorMessage,
  identifyByDni,
  type FaceLivenessSession,
  type IdentityProfile,
} from "../../services/api/auth";
import {
  dniLoginSchema,
  loginSchema,
  type DniLoginFormData,
  type LoginFormData,
} from "../../schemas";

type AccessMode = "dni" | "legacy";
type DniStep = "identify" | "profile" | "face";
type FaceStatus = "idle" | "creating" | "active" | "verifying" | "verified" | "error";

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
  const [identityProfile, setIdentityProfile] = useState<IdentityProfile | null>(null);
  const [identityError, setIdentityError] = useState("");
  const [faceSession, setFaceSession] = useState<FaceLivenessSession | null>(null);
  const [faceError, setFaceError] = useState("");
  const [faceStatus, setFaceStatus] = useState<FaceStatus>("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const { acceptSession, login } = useAuth();
  const navigate = useNavigate();
  const awsConfigurationReady = Boolean(
    import.meta.env.VITE_AWS_COGNITO_IDENTITY_POOL_ID
      && import.meta.env.VITE_AWS_REGION,
  );
  const legacyAccessEnabled = import.meta.env.DEV
    || import.meta.env.VITE_ALLOW_LEGACY_LOGIN === "true";

  const {
    register: registerDni,
    handleSubmit: handleDniSubmit,
    reset: resetDni,
    formState: { errors: dniErrors, isSubmitting: isIdentifying },
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

  const identify = async ({ dni }: DniLoginFormData) => {
    setIdentityError("");
    try {
      const profile = await identifyByDni(dni);
      setIdentifiedDni(dni);
      setIdentityProfile(profile);
      setDniStep("profile");
    } catch (error) {
      setIdentityProfile(null);
      setIdentityError(getIdentificationErrorMessage(error));
    }
  };

  const beginFaceVerification = async () => {
    if (!identifiedDni) return;
    setFaceError("");
    if (!awsConfigurationReady) {
      setFaceStatus("error");
      setFaceError("Falta configurar el Identity Pool de AWS en el frontend.");
      return;
    }

    setFaceStatus("creating");
    try {
      const session = await createFaceLivenessSession(identifiedDni);
      setFaceSession(session);
      setFaceStatus("active");
    } catch (error) {
      setFaceSession(null);
      setFaceStatus("error");
      setFaceError(getFaceVerificationErrorMessage(error));
    }
  };

  const finishFaceVerification = async () => {
    if (!faceSession) return;
    setFaceStatus("verifying");
    setFaceError("");
    try {
      const session = await completeFaceLivenessSession(faceSession.verificationId);
      acceptSession(session);
      setFaceStatus("verified");
    } catch (error) {
      setFaceSession(null);
      setFaceStatus("error");
      setFaceError(getFaceVerificationErrorMessage(error));
    }
  };

  const resetFaceVerification = () => {
    setFaceSession(null);
    setFaceStatus("idle");
    setFaceError("");
  };

  const returnToDni = () => {
    setDniStep("identify");
    setIdentifiedDni("");
    resetFaceVerification();
    setIdentityProfile(null);
    setIdentityError("");
    resetDni({ dni: "" });
  };

  const showLegacyAccess = () => {
    resetFaceVerification();
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
                  <ShieldCheck size={14} />Identidad protegida
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

                    {identityError && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{identityError}</p>}

                    <button disabled={isIdentifying} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                      {isIdentifying ? <><LoaderCircle className="animate-spin" size={17} />Consultando...</> : <>Continuar<ArrowRight size={17} /></>}
                    </button>
                  </form>

                  <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-5 text-slate-600">
                    El DNI se consulta de forma segura en la base de datos mediante FastAPI. Debe estar registrado en una cuenta activa.
                  </div>
                </div>
              )}

              {dniStep === "profile" && identityProfile && (
                <div>
                  <button type="button" onClick={returnToDni} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600"><ArrowLeft size={16} />Cambiar DNI</button>
                  <p className="text-sm font-semibold text-blue-600">Cuenta localizada</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Confirma tus datos</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Revisa que la información corresponda contigo antes de verificar tu identidad.</p>

                  <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 p-5">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-lg font-bold text-white">{identityProfile.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
                      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Perfil encontrado</p><h3 className="mt-1 font-semibold text-slate-950">{identityProfile.name}</h3></div>
                    </div>
                    <dl className="space-y-4 p-5 text-sm">
                      <div className="flex items-center gap-3"><IdCard className="text-slate-400" size={18} /><div><dt className="text-xs text-slate-500">DNI</dt><dd className="mt-0.5 font-semibold text-slate-800">{identityProfile.maskedDni}</dd></div></div>
                      <div className="flex items-center gap-3"><Globe2 className="text-slate-400" size={18} /><div><dt className="text-xs text-slate-500">Nacionalidad</dt><dd className="mt-0.5 font-semibold text-slate-800">{identityProfile.nationality}</dd></div></div>
                      <div className="flex items-center gap-3"><UserCog className="text-slate-400" size={18} /><div><dt className="text-xs text-slate-500">Rol de acceso</dt><dd className="mt-0.5 font-semibold text-slate-800">{identityProfile.role}</dd></div></div>
                    </dl>
                  </div>

                  <button
                    type="button"
                    disabled={!identityProfile.faceEnrolled}
                    onClick={() => { resetFaceVerification(); setDniStep("face"); }}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    Verificar mi identidad<ScanFace size={18} />
                  </button>
                  {!identityProfile.faceEnrolled && (
                    <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                      Un administrador debe registrar primero tu fotografía desde el módulo Usuarios.
                    </p>
                  )}
                </div>
              )}

              {dniStep === "face" && (
                <div>
                  {faceStatus !== "verified" && <button type="button" onClick={() => { resetFaceVerification(); setDniStep("profile"); }} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600"><ArrowLeft size={16} />Volver al perfil</button>}
                  <p className="text-sm font-semibold text-blue-600">Último paso</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Verificación facial</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">AWS comprobará la prueba de vida y FastAPI comparará el rostro con la referencia registrada para esta cuenta.</p>

                  {(faceStatus === "idle" || faceStatus === "error") && (
                    <div className="mt-7 rounded-3xl bg-slate-950 p-8 text-center text-white shadow-xl">
                      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-cyan-300"><Camera size={30} /></div>
                      <p className="mt-4 text-sm font-semibold">Cámara lista para iniciar</p>
                      <p className="mt-2 text-xs leading-5 text-slate-400">Usa iluminación uniforme, retira lentes oscuros y mantén el rostro visible.</p>
                    </div>
                  )}

                  {faceStatus === "creating" && (
                    <div className="mt-7 grid min-h-72 place-items-center rounded-3xl bg-slate-950 text-center text-white shadow-xl">
                      <div><LoaderCircle className="mx-auto animate-spin text-cyan-300" size={34} /><p className="mt-4 text-sm">Creando sesión segura...</p></div>
                    </div>
                  )}

                  {faceStatus === "active" && faceSession && (
                    <div className="mt-7 overflow-hidden rounded-3xl bg-slate-950 shadow-xl">
                      <FaceLivenessDetector
                        key={faceSession.sessionId}
                        sessionId={faceSession.sessionId}
                        region={faceSession.region}
                        onAnalysisComplete={finishFaceVerification}
                        onUserCancel={resetFaceVerification}
                        onError={() => {
                          setFaceSession(null);
                          setFaceStatus("error");
                          setFaceError("La sesión facial se interrumpió. Crea un intento nuevo.");
                        }}
                      />
                    </div>
                  )}

                  {faceStatus === "verifying" && (
                    <div className="mt-7 grid min-h-72 place-items-center rounded-3xl bg-slate-950 text-center text-white shadow-xl">
                      <div><ScanFace className="mx-auto animate-pulse text-cyan-300" size={44} /><p className="mt-4 font-semibold">Confirmando identidad...</p><p className="mt-1 text-xs text-slate-400">Validando prueba de vida y coincidencia facial.</p></div>
                    </div>
                  )}

                  {faceStatus === "verified" && (
                    <div className="mt-7 grid min-h-72 place-items-center rounded-3xl bg-emerald-950 p-8 text-center text-white shadow-xl">
                      <div><CheckCircle2 className="mx-auto text-emerald-300" size={58} /><h3 className="mt-5 text-xl font-bold">Identidad verificada</h3><p className="mt-2 text-sm leading-6 text-emerald-100/80">La prueba de vida y el rostro registrado coincidieron.</p></div>
                    </div>
                  )}

                  {faceError && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{faceError}</p>}

                  {(faceStatus === "idle" || faceStatus === "error") && (
                    <button type="button" onClick={beginFaceVerification} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"><ScanFace size={18} />Iniciar verificación facial</button>
                  )}

                  {faceStatus === "verified" && (
                    <div className="mt-5">
                      <button onClick={() => navigate("/dashboard")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"><LockKeyhole size={17} />Continuar al dashboard</button>
                    </div>
                  )}

                  <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">Al continuar autorizas el procesamiento biométrico necesario para verificar tu identidad. MatrixFlow no guarda el video de la prueba.</p>
                </div>
              )}

              {legacyAccessEnabled && (
                <div className="mt-8 border-t border-slate-200 pt-5 text-center">
                  <button type="button" onClick={showLegacyAccess} className="text-sm font-semibold text-blue-700 hover:text-blue-800">Ingresar temporalmente con correo y contraseña</button>
                </div>
              )}
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
