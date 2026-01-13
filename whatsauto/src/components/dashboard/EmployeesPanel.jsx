"use client";

import { useState } from "react";
import {
  createEmployeeProfile,
  updateEmployeeProfile,
} from "../../lib/employeesData";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  dni: "",
  role: "staff",
  active: "true",
};

export default function EmployeesPanel({
  employees = [],
  canManage,
  isLoading,
  onRefresh,
  companyId,
}) {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formState, setFormState] = useState(emptyForm);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSaving, setIsSaving] = useState(false);
  const columnCount = canManage ? 5 : 4;

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setIsCreating(false);
    setFormState({
      name: employee?.nombre || "",
      email: employee?.correo || "",
      phone: employee?.telefono || "",
      dni: employee?.dni || "",
      role: employee?.role || "staff",
      active: employee?.activo === false ? "false" : "true",
    });
    setStatus({ type: "idle", message: "" });
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    setIsCreating(true);
    setFormState(emptyForm);
    setStatus({ type: "idle", message: "" });
  };

  const handleCancel = () => {
    setEditingEmployee(null);
    setIsCreating(false);
    setFormState(emptyForm);
    setStatus({ type: "idle", message: "" });
  };

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canManage) {
      setStatus({
        type: "error",
        message: "Solo el jefe puede editar empleados.",
      });
      return;
    }

    if (!companyId) {
      setStatus({
        type: "error",
        message: "Falta el identificador de empresa.",
      });
      return;
    }

    if (!isCreating && !editingEmployee?.uuid) {
      setStatus({
        type: "error",
        message: "Selecciona un empleado para editar.",
      });
      return;
    }

    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      setStatus({ type: "error", message: "El nombre es obligatorio." });
      return;
    }

    if (!["boss", "staff"].includes(formState.role)) {
      setStatus({
        type: "error",
        message: "El rol debe ser boss o staff.",
      });
      return;
    }

    setIsSaving(true);
    setStatus({ type: "loading", message: "Guardando cambios..." });

    const payload = {
      companyId,
      name: trimmedName,
      email: formState.email.trim(),
      phone: formState.phone.trim(),
      dni: formState.dni.trim(),
      role: formState.role,
      active: formState.active === "true",
    };

    const result = isCreating
      ? await createEmployeeProfile(payload)
      : await updateEmployeeProfile({
          employeeId: editingEmployee.uuid,
          ...payload,
        });

    if (result?.error) {
      setStatus({
        type: "error",
        message:
          result.error.message ||
          "No pudimos actualizar el empleado. Intenta otra vez.",
      });
      setIsSaving(false);
      return;
    }

    setStatus({
      type: "success",
      message: isCreating
        ? "Empleado creado correctamente."
        : "Empleado actualizado correctamente.",
    });
    setIsSaving(false);
    handleCancel();
    onRefresh?.();
  };

  const isFormOpen = isCreating || Boolean(editingEmployee);

  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Empleados
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            Equipo activo
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--muted-strong)]">
            {employees.length}
          </span>
          {canManage && (
            <button
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={isFormOpen ? handleCancel : handleCreate}
              type="button"
            >
              {isFormOpen ? "Cerrar" : "Anadir empleado"}
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          Solo el jefe puede editar empleados. Puedes ver el listado completo.
        </p>
      )}

      {isFormOpen && canManage && (
        <form
          className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-5"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {isCreating ? "Nuevo empleado" : "Editar empleado"}
              </p>
              <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                {isCreating
                  ? "Completa los datos del nuevo empleado."
                  : "Actualiza los datos visibles del empleado."}
              </p>
            </div>
            <button
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={handleCancel}
              type="button"
            >
              Cancelar
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[color:var(--foreground)]">
              Nombre
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("name")}
                placeholder="Nombre completo"
                required
                type="text"
                value={formState.name}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Correo
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("email")}
                placeholder="correo@empresa.com"
                type="email"
                value={formState.email}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Telefono
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("phone")}
                placeholder="600 000 000"
                type="text"
                value={formState.phone}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              DNI
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("dni")}
                placeholder="12345678A"
                type="text"
                value={formState.dni}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Rol
              <select
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("role")}
                value={formState.role}
              >
                <option value="boss">Boss</option>
                <option value="staff">Staff</option>
              </select>
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Estado
              <select
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("active")}
                value={formState.active}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-[linear-gradient(135deg,var(--supabase-green),var(--supabase-green-dark))] px-5 py-3 text-sm font-semibold text-[#04140b] shadow-[0_18px_40px_-24px_rgba(31,157,107,0.6)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {isCreating ? "Crear empleado" : "Guardar cambios"}
            </button>
            <button
              className="rounded-2xl border border-[color:var(--border)] px-5 py-3 text-sm font-semibold text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={handleCancel}
              type="button"
            >
              Cancelar
            </button>
          </div>

          {status.message && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                status.type === "error"
                  ? "border-rose-300/30 bg-rose-500/10 text-rose-200"
                  : status.type === "success"
                  ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-200"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted)]"
              }`}
            >
              {status.message}
            </div>
          )}
        </form>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            <tr>
              <th className="pb-3" scope="col">
                Empleado
              </th>
              <th className="pb-3" scope="col">
                Contacto
              </th>
              <th className="pb-3" scope="col">
                Rol
              </th>
              <th className="pb-3" scope="col">
                Estado
              </th>
              {canManage && (
                <th className="pb-3 text-right" scope="col">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="py-4 text-[color:var(--muted)]" colSpan={columnCount}>
                  Cargando empleados...
                </td>
              </tr>
            ) : employees.length ? (
              employees.map((employee) => (
                <tr
                  key={employee.uuid}
                  className="border-t border-[color:var(--border)]"
                >
                  <td className="py-4">
                    <div className="font-semibold text-[color:var(--foreground)]">
                      {employee.nombre}
                    </div>
                    {employee.dni && (
                      <div className="text-xs text-[color:var(--muted)]">
                        DNI {employee.dni}
                      </div>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="text-[color:var(--muted-strong)]">
                      {employee.correo || "Sin correo"}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {employee.telefono || "Sin telefono"}
                    </div>
                  </td>
                  <td className="py-4 text-[color:var(--muted-strong)]">
                    {employee.role || "staff"}
                  </td>
                  <td className="py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                        employee.activo === false
                          ? "border-rose-400/40 text-rose-200"
                          : "border-emerald-300/40 text-emerald-200"
                      }`}
                    >
                      {employee.activo === false ? "Inactivo" : "Activo"}
                    </span>
                  </td>
                  {canManage && (
                    <td className="py-4 text-right">
                      <button
                        className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
                        onClick={() => handleEdit(employee)}
                        type="button"
                      >
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-4 text-[color:var(--muted)]" colSpan={columnCount}>
                  No hay empleados registrados por ahora.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
