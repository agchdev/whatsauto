"use client";

import { useMemo, useState } from "react";
import { formatDuration, formatPrice } from "../../lib/formatters";
import {
  createServiceWithAssignment,
  updateServiceWithAssignment,
} from "../../lib/servicesData";

const emptyForm = {
  name: "",
  duration: "",
  price: "",
  employeeId: "",
};

const getAssignedEmployees = (service) =>
  (service?.servicios_empleados || [])
    .map((link) => link?.empleados)
    .filter(Boolean);

export default function ServicesPanel({
  services = [],
  employees = [],
  companyId,
  canManage,
  isLoading,
  onRefresh,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState(emptyForm);
  const [editingService, setEditingService] = useState(null);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSaving, setIsSaving] = useState(false);

  const employeeOptions = useMemo(() => employees, [employees]);

  const handleOpenCreate = () => {
    setEditingService(null);
    setFormState(emptyForm);
    setStatus({ type: "idle", message: "" });
    setFormOpen(true);
  };

  const handleEdit = (service) => {
    const assignedEmployees = getAssignedEmployees(service);
    setEditingService(service);
    setFormState({
      name: service?.nombre || "",
      duration: service?.duracion?.toString?.() || "",
      price: service?.precio?.toString?.() || "",
      employeeId: assignedEmployees[0]?.uuid || "",
    });
    setStatus({ type: "idle", message: "" });
    setFormOpen(true);
  };

  const handleCancel = () => {
    setEditingService(null);
    setFormState(emptyForm);
    setStatus({ type: "idle", message: "" });
    setFormOpen(false);
  };

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canManage) {
      setStatus({
        type: "error",
        message: "Solo el jefe puede crear o editar servicios.",
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

    const trimmedName = formState.name.trim();
    const durationValue = Number(formState.duration);
    const priceValue = Number(formState.price);

    if (!trimmedName) {
      setStatus({ type: "error", message: "El nombre es obligatorio." });
      return;
    }
    if (!Number.isFinite(durationValue) || durationValue <= 0) {
      setStatus({
        type: "error",
        message: "La duracion debe ser un numero mayor que 0.",
      });
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setStatus({
        type: "error",
        message: "El precio debe ser un numero valido.",
      });
      return;
    }
    if (!formState.employeeId) {
      setStatus({
        type: "error",
        message: "Selecciona el empleado al que se asigna el servicio.",
      });
      return;
    }

    setIsSaving(true);
    setStatus({ type: "loading", message: "Guardando servicio..." });

    const payload = {
      name: trimmedName,
      duration: durationValue,
      price: priceValue,
      employeeId: formState.employeeId,
      companyId,
    };

    const result = editingService
      ? await updateServiceWithAssignment({
          serviceId: editingService.uuid,
          ...payload,
        })
      : await createServiceWithAssignment(payload);

    if (result?.error) {
      setStatus({
        type: "error",
        message:
          result.error.message || "No pudimos guardar el servicio. Intenta otra vez.",
      });
      setIsSaving(false);
      return;
    }

    setStatus({
      type: "success",
      message: editingService
        ? "Servicio actualizado correctamente."
        : "Servicio creado correctamente.",
    });

    if (editingService) {
      handleCancel();
    } else {
      setFormState(emptyForm);
    }

    setIsSaving(false);
    onRefresh?.();
  };

  const columnCount = canManage ? 5 : 4;

  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Servicios
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            Servicios de la empresa
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--muted-strong)]">
            {services.length}
          </span>
          {canManage && (
            <button
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={formOpen && !editingService ? handleCancel : handleOpenCreate}
              type="button"
            >
              {formOpen && !editingService ? "Cerrar" : "Anadir servicio"}
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          Solo el jefe puede crear o editar servicios. Puedes ver la tabla completa.
        </p>
      )}

      {formOpen && canManage && (
        <form
          className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-5"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {editingService ? "Editar servicio" : "Nuevo servicio"}
              </p>
              <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                Completa los datos y asigna el servicio a un empleado.
              </p>
            </div>
            {editingService && (
              <button
                className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
                onClick={handleCancel}
                type="button"
              >
                Cancelar edicion
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[color:var(--foreground)]">
              Nombre
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("name")}
                placeholder="Corte clasico"
                required
                type="text"
                value={formState.name}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Duracion (minutos)
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                min="1"
                onChange={handleChange("duration")}
                placeholder="30"
                required
                step="1"
                type="number"
                value={formState.duration}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Precio
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                min="0"
                onChange={handleChange("price")}
                placeholder="15"
                required
                step="0.01"
                type="number"
                value={formState.price}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Empleado asignado
              <select
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("employeeId")}
                required
                value={formState.employeeId}
              >
                <option value="">Selecciona un empleado</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.uuid} value={employee.uuid}>
                    {employee.nombre} {employee.correo ? `(${employee.correo})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-[linear-gradient(135deg,var(--supabase-green),var(--supabase-green-dark))] px-5 py-3 text-sm font-semibold text-[#04140b] shadow-[0_18px_40px_-24px_rgba(31,157,107,0.6)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {editingService ? "Guardar cambios" : "Crear servicio"}
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
                Servicio
              </th>
              <th className="pb-3" scope="col">
                Duracion
              </th>
              <th className="pb-3" scope="col">
                Precio
              </th>
              <th className="pb-3" scope="col">
                Empleado asignado
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
                  Cargando servicios...
                </td>
              </tr>
            ) : services.length ? (
              services.map((service) => {
                const assignedEmployees = getAssignedEmployees(service);
                const employeeNames = assignedEmployees
                  .map((employee) => employee.nombre)
                  .join(", ");
                const employeeEmails = assignedEmployees
                  .map((employee) => employee.correo)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <tr
                    key={service.uuid}
                    className="border-t border-[color:var(--border)]"
                  >
                    <td className="py-4">
                      <div className="font-semibold text-[color:var(--foreground)]">
                        {service.nombre}
                      </div>
                    </td>
                    <td className="py-4 text-[color:var(--muted-strong)]">
                      {formatDuration(service.duracion)}
                    </td>
                    <td className="py-4 text-[color:var(--muted-strong)]">
                      {formatPrice(service.precio)}
                    </td>
                    <td className="py-4">
                      <div className="text-[color:var(--foreground)]">
                        {employeeNames || "Sin asignar"}
                      </div>
                      {employeeEmails && (
                        <div className="text-xs text-[color:var(--muted)]">
                          {employeeEmails}
                        </div>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-4 text-right">
                        <button
                          className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
                          onClick={() => handleEdit(service)}
                          type="button"
                        >
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="py-4 text-[color:var(--muted)]" colSpan={columnCount}>
                  No hay servicios registrados por ahora.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
