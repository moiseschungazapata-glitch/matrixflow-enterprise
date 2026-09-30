import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Edit3, ImagePlus, LoaderCircle, Plus, RefreshCw, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../hooks/useAuth";
import { userSchema, type UserFormData } from "../../schemas";
import {
  createUser,
  deleteUser,
  enrollFaceReference,
  getUserApiErrorMessage,
  listUsers,
  removeFaceReference,
  updateUser,
  type CreateUserInput,
  type UpdateUserInput,
} from "../../services/api/users";
import type { Role, UserRecord } from "../../types";

const emptyUser: UserFormData = {
  name: "",
  dni: "",
  nationality: "",
  email: "",
  password: "",
  role: "Consulta",
  status: "Activo",
};

const fieldClass = "mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

type SaveUserRequest =
  | { mode: "create"; data: CreateUserInput }
  | { mode: "update"; userId: number; data: UpdateUserInput };

interface Feedback {
  type: "success" | "error";
  message: string;
}

const roleCards: { role: Role; description: string; color: string }[] = [
  { role: "Administrador", description: "Control total y configuración", color: "bg-blue-50 text-blue-700" },
  { role: "Analista", description: "Ventas, inventario y análisis", color: "bg-cyan-50 text-cyan-700" },
  { role: "Consulta", description: "Dashboard y reportes", color: "bg-violet-50 text-violet-700" },
];

export default function Usuarios() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [faceUser, setFaceUser] = useState<UserRecord | null>(null);
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: emptyUser,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const saveMutation = useMutation({
    mutationFn: (request: SaveUserRequest) => request.mode === "create"
      ? createUser(request.data)
      : updateUser(request.userId, request.data),
    onSuccess: async (_user, request) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setFeedback({
        type: "success",
        message: request.mode === "create" ? "Usuario creado correctamente." : "Usuario actualizado correctamente.",
      });
      setOpen(false);
      setEditing(null);
      reset(emptyUser);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setFeedback({ type: "success", message: "Usuario eliminado correctamente." });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: getUserApiErrorMessage(error) });
    },
  });

  const faceMutation = useMutation({
    mutationFn: ({ userId, image }: { userId: number; image: File }) => enrollFaceReference(userId, image),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setFeedback({ type: "success", message: "Rostro de referencia registrado correctamente." });
      setFaceUser(null);
      setFaceImage(null);
    },
  });

  const removeFaceMutation = useMutation({
    mutationFn: removeFaceReference,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setFeedback({ type: "success", message: "Referencia facial eliminada correctamente." });
      setFaceUser(null);
      setFaceImage(null);
    },
  });

  const users = usersQuery.data ?? [];
  const editingSelf = editing?.id === currentUser?.id;

  const showCreate = () => {
    setFeedback(null);
    setEditing(null);
    saveMutation.reset();
    reset(emptyUser);
    setOpen(true);
  };

  const showEdit = (user: UserRecord) => {
    setFeedback(null);
    setEditing(user);
    saveMutation.reset();
    reset({
      ...user,
      dni: user.dni ?? "",
      nationality: user.nationality ?? "",
      password: "",
    });
    setOpen(true);
  };

  const showFaceEnrollment = (user: UserRecord) => {
    setFeedback(null);
    faceMutation.reset();
    removeFaceMutation.reset();
    setFaceImage(null);
    setFaceUser(user);
  };

  const closeModal = () => {
    if (saveMutation.isPending) return;
    setOpen(false);
    setEditing(null);
    saveMutation.reset();
  };

  const submit = (data: UserFormData) => {
    if (!editing && data.password.length < 6) {
      setError("password", { message: "La contraseña es obligatoria y debe tener al menos 6 caracteres" });
      return;
    }

    const baseData = {
      name: data.name,
      dni: data.dni || null,
      nationality: data.nationality || null,
      email: data.email,
      role: editingSelf && editing ? editing.role : data.role,
      status: editingSelf && editing ? editing.status : data.status,
    };

    if (editing) {
      const updateData: UpdateUserInput = {
        ...baseData,
        ...(data.password ? { password: data.password } : {}),
      };
      saveMutation.mutate({ mode: "update", userId: editing.id, data: updateData });
      return;
    }

    saveMutation.mutate({
      mode: "create",
      data: { ...baseData, password: data.password },
    });
  };

  const remove = (user: UserRecord) => {
    if (user.id === currentUser?.id) return;
    setFeedback(null);
    if (window.confirm(`¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios y roles"
        description="Gestiona las cuentas reales almacenadas en la base de datos."
        action={(
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => usersQuery.refetch()}
              disabled={usersQuery.isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              <RefreshCw size={17} className={usersQuery.isFetching ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button
              type="button"
              onClick={showCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={17} />Nuevo usuario
            </button>
          </div>
        )}
      />

      <section className="space-y-6 p-4 sm:p-6 lg:p-8">
        {feedback && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {feedback.message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {roleCards.map((item) => (
            <div key={item.role} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${item.color}`}><ShieldCheck size={20} /></div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div><h2 className="font-semibold text-slate-900">{item.role}</h2><p className="mt-1 text-sm text-slate-500">{item.description}</p></div>
                <span className="text-2xl font-bold text-slate-900">{users.filter((user) => user.role === item.role).length}</span>
              </div>
            </div>
          ))}
        </div>

        {usersQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-sm font-medium text-rose-700">{getUserApiErrorMessage(usersQuery.error)}</p>
            <button type="button" onClick={() => usersQuery.refetch()} className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Reintentar</button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-4">Usuario</th><th className="px-5 py-4">Rol</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersQuery.isLoading ? (
                    <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500"><LoaderCircle className="mx-auto mb-3 animate-spin" size={24} />Cargando usuarios reales...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">No hay usuarios registrados.</td></tr>
                  ) : users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500"><UserRound size={17} /></div>
                          <div><p className="font-semibold text-slate-900">{user.name}{user.id === currentUser?.id && <span className="ml-2 text-xs font-medium text-blue-600">Tú</span>}</p><p className="text-xs text-slate-500">{user.email}</p>{user.dni && <p className="mt-0.5 text-xs text-slate-400">DNI ••••{user.dni.slice(-4)}{user.nationality ? ` · ${user.nationality}` : ""}</p>}<p className={`mt-1 text-xs font-medium ${user.faceEnrolled ? "text-emerald-600" : "text-amber-600"}`}>{user.faceEnrolled ? "Rostro registrado" : "Rostro pendiente"}</p></div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{user.role}</td>
                      <td className="px-5 py-4"><StatusBadge label={user.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => showFaceEnrollment(user)} className="rounded-lg p-2 text-slate-500 hover:bg-cyan-50 hover:text-cyan-600" aria-label={`Gestionar rostro de ${user.name}`} title="Gestionar rostro"><Camera size={17} /></button>
                          <button type="button" onClick={() => showEdit(user)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600" aria-label={`Editar ${user.name}`}><Edit3 size={17} /></button>
                          <button
                            type="button"
                            disabled={user.id === currentUser?.id || deleteMutation.isPending}
                            onClick={() => remove(user)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Eliminar ${user.name}`}
                            title={user.id === currentUser?.id ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario"}
                          ><Trash2 size={17} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <Modal open={open} onClose={closeModal} title={editing ? "Editar usuario" : "Nuevo usuario"} description={editing ? "La contraseña solo cambiará si escribes una nueva." : "La cuenta podrá iniciar sesión inmediatamente después de guardarla."}>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          {saveMutation.isError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{getUserApiErrorMessage(saveMutation.error)}</p>}

          <label className="block text-sm font-medium text-slate-700">
            Nombre
            <input {...register("name")} className={fieldClass} autoComplete="name" />
            {errors.name && <span className="mt-1 block text-xs text-rose-600">{errors.name.message}</span>}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              DNI
              <input {...register("dni", { onChange: (event) => { event.target.value = event.target.value.replace(/\D/g, "").slice(0, 8); } })} inputMode="numeric" maxLength={8} className={fieldClass} autoComplete="off" />
              {errors.dni && <span className="mt-1 block text-xs text-rose-600">{errors.dni.message}</span>}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Nacionalidad
              <input {...register("nationality")} className={fieldClass} placeholder="Ej. Peruana" autoComplete="country-name" />
              {errors.nationality && <span className="mt-1 block text-xs text-rose-600">{errors.nationality.message}</span>}
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Correo
            <input {...register("email")} type="email" className={fieldClass} autoComplete="email" />
            {errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email.message}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            {editing ? "Nueva contraseña (opcional)" : "Contraseña"}
            <input {...register("password")} type="password" className={fieldClass} autoComplete="new-password" />
            {errors.password && <span className="mt-1 block text-xs text-rose-600">{errors.password.message}</span>}
            {editing && <span className="mt-1 block text-xs font-normal text-slate-500">Déjala vacía para conservar la contraseña actual.</span>}
          </label>

          {editingSelf && editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" {...register("role")} />
              <input type="hidden" {...register("status")} />
              <div><p className="text-sm font-medium text-slate-700">Rol</p><p className="mt-1.5 rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600">{editing.role}</p></div>
              <div><p className="text-sm font-medium text-slate-700">Estado</p><p className="mt-1.5 rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600">{editing.status}</p></div>
              <p className="text-xs text-slate-500 sm:col-span-2">Tu propio rol y estado están protegidos para evitar que pierdas el acceso administrativo.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">Rol<select {...register("role")} className={fieldClass}><option>Administrador</option><option>Analista</option><option>Consulta</option></select></label>
              <label className="block text-sm font-medium text-slate-700">Estado<select {...register("status")} className={fieldClass}><option>Activo</option><option>Inactivo</option></select></label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} disabled={saveMutation.isPending} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60">Cancelar</button>
            <button disabled={saveMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {saveMutation.isPending && <LoaderCircle className="animate-spin" size={17} />}{editing ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(faceUser)}
        onClose={() => {
          if (faceMutation.isPending || removeFaceMutation.isPending) return;
          setFaceUser(null);
          setFaceImage(null);
        }}
        title="Identidad facial"
        description={faceUser ? `Registra una fotografía clara de ${faceUser.name}.` : ""}
      >
        {faceUser && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-slate-700">
              AWS guardará únicamente la plantilla facial en la colección exclusiva de MatrixFlow. Usa una fotografía frontal, reciente, con un solo rostro y buena iluminación.
            </div>

            {(faceMutation.isError || removeFaceMutation.isError) && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {getUserApiErrorMessage(faceMutation.error ?? removeFaceMutation.error)}
              </p>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Fotografía JPEG o PNG
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(event) => setFaceImage(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700"
              />
            </label>

            <div className="flex flex-wrap justify-between gap-3 pt-2">
              <div>
                {faceUser.faceEnrolled && (
                  <button
                    type="button"
                    disabled={removeFaceMutation.isPending || faceMutation.isPending}
                    onClick={() => {
                      if (window.confirm("¿Eliminar la referencia facial registrada?")) {
                        removeFaceMutation.mutate(faceUser.id);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-60"
                  >
                    <Trash2 size={16} />Eliminar referencia
                  </button>
                )}
              </div>
              <button
                type="button"
                disabled={!faceImage || faceMutation.isPending || removeFaceMutation.isPending}
                onClick={() => faceImage && faceMutation.mutate({ userId: faceUser.id, image: faceImage })}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {faceMutation.isPending ? <LoaderCircle className="animate-spin" size={17} /> : <ImagePlus size={17} />}
                {faceUser.faceEnrolled ? "Reemplazar rostro" : "Registrar rostro"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
