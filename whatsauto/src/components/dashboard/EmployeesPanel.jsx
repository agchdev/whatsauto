"use client";

import { useState } from "react";
import {
  createEmployeeProfile,
  updateEmployeeProfile,
} from "../../lib/employeesData";
import { getSupabaseClient } from "../../lib/supabaseClient";

const WEEKDAY_LABELS = ["", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const DATE_FORMATTER = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" });

const buildErrorMessage = (fallback, error) => {
  const details = error?.message || error?.details || "";
  return details ? `${fallback} (${details})` : fallback;
};

const parseDateValue = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const parts = value.split("-");
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const day = Number(parts[2]);
      if (
        !Number.isNaN(year) &&
        !Number.isNaN(month) &&
        !Number.isNaN(day)
      ) {
        return new Date(year, month - 1, day);
      }
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = parseDateValue(value);
  return date ? DATE_FORMATTER.format(date) : "--";
};

const formatTime = (value) => {
  if (!value) return "--";
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : text;
};

const formatTimeRange = (start, end) => {
  const startLabel = formatTime(start);
  const endLabel = formatTime(end);
  if (startLabel === "--" && endLabel === "--") return "--";
  if (startLabel === "--") return endLabel;
  if (endLabel === "--") return startLabel;
  return `${startLabel} - ${endLabel}`;
};

const pad2 = (value) => String(value).padStart(2, "0");

const formatDateInput = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = parseDateValue(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
};

const normalizeTimeInput = (value) => {
  if (!value) return "";
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : text;
};

const emptyScheduleForm = {
  dia_semana: "1",
  hora_entrada: "",
  hora_salida: "",
  hora_descanso_inicio: "",
  hora_descanso_fin: "",
};

const emptyVacationForm = {
  fecha_inicio: "",
  fecha_fin: "",
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  dni: "",
  role: "staff",
  active: "true",
};

const ModalShell = ({ isOpen, onClose, children, size = "max-w-2xl" }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-10"
      onClick={onClose}
    >
      <div
        className={`w-full ${size} rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_32px_90px_-60px_rgba(0,0,0,0.9)]`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
};

export default function EmployeesPanel({
  employees = [],
  canManage,
  isLoading,
  onRefresh,
  companyId,
  onCreated,
}) {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formState, setFormState] = useState(emptyForm);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [vacationsError, setVacationsError] = useState("");
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
  const [vacationForm, setVacationForm] = useState(emptyVacationForm);
  const [scheduleEditingId, setScheduleEditingId] = useState(null);
  const [vacationEditingId, setVacationEditingId] = useState(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [vacationSaving, setVacationSaving] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
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

  const resolveSupabase = () => {
    try {
      return { client: getSupabaseClient(), error: null };
    } catch (error) {
      return { client: null, error };
    }
  };

  const resetScheduleForm = () => {
    setScheduleForm(emptyScheduleForm);
    setScheduleEditingId(null);
    setScheduleError("");
  };

  const resetVacationForm = () => {
    setVacationForm(emptyVacationForm);
    setVacationEditingId(null);
    setVacationsError("");
  };

  const openScheduleModal = () => {
    resetScheduleForm();
    setIsScheduleModalOpen(true);
  };

  const openScheduleModalForEdit = (item) => {
    handleScheduleEdit(item);
    setIsScheduleModalOpen(true);
  };

  const closeScheduleModal = () => {
    resetScheduleForm();
    setIsScheduleModalOpen(false);
  };

  const openVacationModal = () => {
    resetVacationForm();
    setIsVacationModalOpen(true);
  };

  const openVacationModalForEdit = (item) => {
    handleVacationEdit(item);
    setIsVacationModalOpen(true);
  };

  const closeVacationModal = () => {
    resetVacationForm();
    setIsVacationModalOpen(false);
  };

  const loadEmployeeDetails = async (employee) => {
    if (!employee?.uuid) return;

    setSelectedEmployee(employee);
    setSchedule([]);
    setVacations([]);
    setScheduleError("");
    setVacationsError("");
    setDetailsLoading(true);

    const { client, error } = resolveSupabase();
    if (error || !client) {
      const message = buildErrorMessage(
        "Faltan variables de entorno de Supabase.",
        error
      );
      setScheduleError(message);
      setVacationsError(message);
      setDetailsLoading(false);
      return;
    }

    const [scheduleResponse, vacationsResponse] = await Promise.all([
      client
        .from("horarios")
        .select(
          "uuid,dia_semana,hora_entrada,hora_salida,hora_descanso_inicio,hora_descanso_fin"
        )
        .eq("id_empleado", employee.uuid)
        .order("dia_semana", { ascending: true }),
      client
        .from("vacaciones")
        .select("uuid,fecha_inicio,fecha_fin")
        .eq("id_empleado", employee.uuid)
        .order("fecha_inicio", { ascending: false }),
    ]);

    if (scheduleResponse?.error) {
      setScheduleError(
        buildErrorMessage("No pudimos cargar los horarios.", scheduleResponse.error)
      );
    } else {
      setSchedule(scheduleResponse?.data ?? []);
    }

    if (vacationsResponse?.error) {
      setVacationsError(
        buildErrorMessage(
          "No pudimos cargar las vacaciones.",
          vacationsResponse.error
        )
      );
    } else {
      setVacations(vacationsResponse?.data ?? []);
    }

    setDetailsLoading(false);
  };

  const handleSelectEmployee = async (employee) => {
    resetScheduleForm();
    resetVacationForm();
    setIsScheduleModalOpen(false);
    setIsVacationModalOpen(false);
    await loadEmployeeDetails(employee);
  };

  const handleScheduleChange = (field) => (event) => {
    setScheduleForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleVacationChange = (field) => (event) => {
    setVacationForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleScheduleEdit = (item) => {
    if (!item) return;
    setScheduleEditingId(item.uuid);
    setScheduleForm({
      dia_semana: String(item.dia_semana || "1"),
      hora_entrada: normalizeTimeInput(item.hora_entrada),
      hora_salida: normalizeTimeInput(item.hora_salida),
      hora_descanso_inicio: normalizeTimeInput(item.hora_descanso_inicio),
      hora_descanso_fin: normalizeTimeInput(item.hora_descanso_fin),
    });
    setScheduleError("");
  };

  const handleVacationEdit = (item) => {
    if (!item) return;
    setVacationEditingId(item.uuid);
    setVacationForm({
      fecha_inicio: formatDateInput(item.fecha_inicio),
      fecha_fin: formatDateInput(item.fecha_fin),
    });
    setVacationsError("");
  };

  const handleScheduleSubmit = async (event) => {
    event.preventDefault();

    if (!canManage) {
      setScheduleError("Solo el jefe puede editar horarios.");
      return;
    }

    if (!selectedEmployee?.uuid) {
      setScheduleError("Selecciona un empleado primero.");
      return;
    }

    if (!companyId) {
      setScheduleError("Falta el identificador de empresa.");
      return;
    }

    const dayNumber = Number(scheduleForm.dia_semana);
    if (!dayNumber || dayNumber < 1 || dayNumber > 7) {
      setScheduleError("El dia debe estar entre 1 y 7.");
      return;
    }

    const { client, error } = resolveSupabase();
    if (error || !client) {
      setScheduleError(
        buildErrorMessage("Faltan variables de entorno de Supabase.", error)
      );
      return;
    }

    setScheduleSaving(true);
    setScheduleError("");

    const payload = {
      id_empresa: companyId,
      id_empleado: selectedEmployee.uuid,
      dia_semana: dayNumber,
      hora_entrada: scheduleForm.hora_entrada || null,
      hora_salida: scheduleForm.hora_salida || null,
      hora_descanso_inicio: scheduleForm.hora_descanso_inicio || null,
      hora_descanso_fin: scheduleForm.hora_descanso_fin || null,
    };

    const isCreatingSchedule = !scheduleEditingId;
    const response = scheduleEditingId
      ? await client.from("horarios").update(payload).eq("uuid", scheduleEditingId)
      : await client.from("horarios").insert(payload);

    if (response?.error) {
      setScheduleError(
        buildErrorMessage("No pudimos guardar el horario.", response.error)
      );
      setScheduleSaving(false);
      return;
    }

    resetScheduleForm();
    await loadEmployeeDetails(selectedEmployee);
    setScheduleSaving(false);
    setIsScheduleModalOpen(false);

    if (isCreatingSchedule) {
      onCreated?.({
        title: "Horario creado",
        message: "Horario guardado correctamente.",
      });
    }
  };

  const handleVacationSubmit = async (event) => {
    event.preventDefault();

    if (!canManage) {
      setVacationsError("Solo el jefe puede editar vacaciones.");
      return;
    }

    if (!selectedEmployee?.uuid) {
      setVacationsError("Selecciona un empleado primero.");
      return;
    }

    if (!companyId) {
      setVacationsError("Falta el identificador de empresa.");
      return;
    }

    const startDate = parseDateValue(vacationForm.fecha_inicio);
    const endDate = parseDateValue(vacationForm.fecha_fin);

    if (!startDate || !endDate) {
      setVacationsError("Completa las fechas de inicio y fin.");
      return;
    }

    if (startDate.getTime() > endDate.getTime()) {
      setVacationsError("La fecha de inicio no puede ser mayor a la de fin.");
      return;
    }

    const { client, error } = resolveSupabase();
    if (error || !client) {
      setVacationsError(
        buildErrorMessage("Faltan variables de entorno de Supabase.", error)
      );
      return;
    }

    setVacationSaving(true);
    setVacationsError("");

    const payload = {
      id_empresa: companyId,
      id_empleado: selectedEmployee.uuid,
      fecha_inicio: vacationForm.fecha_inicio,
      fecha_fin: vacationForm.fecha_fin,
    };

    const isCreatingVacation = !vacationEditingId;
    const response = vacationEditingId
      ? await client
          .from("vacaciones")
          .update(payload)
          .eq("uuid", vacationEditingId)
      : await client.from("vacaciones").insert(payload);

    if (response?.error) {
      setVacationsError(
        buildErrorMessage("No pudimos guardar las vacaciones.", response.error)
      );
      setVacationSaving(false);
      return;
    }

    resetVacationForm();
    await loadEmployeeDetails(selectedEmployee);
    setVacationSaving(false);
    setIsVacationModalOpen(false);

    if (isCreatingVacation) {
      onCreated?.({
        title: "Vacaciones creadas",
        message: "Vacaciones registradas correctamente.",
      });
    }
  };

  const handleScheduleDelete = async (item) => {
    if (!canManage || !item?.uuid || !selectedEmployee?.uuid) return;

    if (!window.confirm("Eliminar este horario?")) return;

    const { client, error } = resolveSupabase();
    if (error || !client) {
      setScheduleError(
        buildErrorMessage("Faltan variables de entorno de Supabase.", error)
      );
      return;
    }

    setScheduleSaving(true);
    setScheduleError("");

    const { error: deleteError } = await client
      .from("horarios")
      .delete()
      .eq("uuid", item.uuid);

    if (deleteError) {
      setScheduleError(
        buildErrorMessage("No pudimos eliminar el horario.", deleteError)
      );
      setScheduleSaving(false);
      return;
    }

    if (scheduleEditingId === item.uuid) {
      resetScheduleForm();
    }

    await loadEmployeeDetails(selectedEmployee);
    setScheduleSaving(false);
  };

  const handleVacationDelete = async (item) => {
    if (!canManage || !item?.uuid || !selectedEmployee?.uuid) return;

    if (!window.confirm("Eliminar estas vacaciones?")) return;

    const { client, error } = resolveSupabase();
    if (error || !client) {
      setVacationsError(
        buildErrorMessage("Faltan variables de entorno de Supabase.", error)
      );
      return;
    }

    setVacationSaving(true);
    setVacationsError("");

    const { error: deleteError } = await client
      .from("vacaciones")
      .delete()
      .eq("uuid", item.uuid);

    if (deleteError) {
      setVacationsError(
        buildErrorMessage("No pudimos eliminar las vacaciones.", deleteError)
      );
      setVacationSaving(false);
      return;
    }

    if (vacationEditingId === item.uuid) {
      resetVacationForm();
    }

    await loadEmployeeDetails(selectedEmployee);
    setVacationSaving(false);
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

    const isCreateAction = isCreating;
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

    if (isCreateAction) {
      onCreated?.({
        title: "Empleado creado",
        message: trimmedName
          ? `${trimmedName} ya esta en el equipo.`
          : "Empleado creado correctamente.",
      });
    }
    setIsSaving(false);
    handleCancel();
    onRefresh?.();
  };

  const isFormOpen = isCreating || Boolean(editingEmployee);
  const isScheduleFormDisabled =
    !selectedEmployee || scheduleSaving || detailsLoading;
  const isVacationFormDisabled =
    !selectedEmployee || vacationSaving || detailsLoading;

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

      <div className="mt-6 space-y-3 md:hidden">
        {isLoading ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
            Cargando empleados...
          </div>
        ) : employees.length ? (
          employees.map((employee) => {
            const isSelected = selectedEmployee?.uuid === employee.uuid;
            const statusStyles =
              employee.activo === false
                ? "border-rose-400/40 text-rose-200"
                : "border-emerald-300/40 text-emerald-200";

            return (
              <div
                key={employee.uuid}
                className={`rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 ${
                  isSelected ? "ring-1 ring-[color:var(--supabase-green)]" : ""
                }`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => handleSelectEmployee(employee)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--foreground)]">
                        {employee.nombre}
                      </p>
                      {employee.dni && (
                        <p className="text-xs text-[color:var(--muted)]">
                          DNI {employee.dni}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="mt-1 h-2 w-2 rounded-full bg-[color:var(--supabase-green)] shadow-[0_0_12px_rgba(62,207,142,0.9)]" />
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Contacto
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                        {employee.correo || "Sin correo"}
                      </p>
                      <p className="text-xs text-[color:var(--muted)]">
                        {employee.telefono || "Sin telefono"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Rol
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                        {employee.role || "staff"}
                      </p>
                    </div>
                  </div>
                </button>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusStyles}`}
                  >
                    {employee.activo === false ? "Inactivo" : "Activo"}
                  </span>
                  {canManage && (
                    <button
                      className="rounded-full border border-[color:var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(employee);
                      }}
                      type="button"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
            No hay empleados registrados por ahora.
          </div>
        )}
      </div>

      <div className="mt-6 hidden overflow-x-auto md:block">
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
              employees.map((employee) => {
                const isSelected = selectedEmployee?.uuid === employee.uuid;
                return (
                  <tr
                    key={employee.uuid}
                    className={`border-t border-[color:var(--border)] transition hover:bg-[color:var(--surface-strong)] ${
                      isSelected ? "bg-[color:var(--surface-muted)]" : ""
                    }`}
                  >
                  <td
                    className="cursor-pointer py-4"
                    onClick={() => handleSelectEmployee(employee)}
                  >
                    <div className="flex w-full items-start justify-between gap-3 text-left">
                      <span>
                        <span className="block font-semibold text-[color:var(--foreground)]">
                          {employee.nombre}
                        </span>
                        {employee.dni && (
                          <span className="block text-xs text-[color:var(--muted)]">
                            DNI {employee.dni}
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-[color:var(--supabase-green)] shadow-[0_0_12px_rgba(62,207,142,0.9)]" />
                      )}
                    </div>
                  </td>
                  <td
                    className="cursor-pointer py-4"
                    onClick={() => handleSelectEmployee(employee)}
                  >
                    <div className="text-[color:var(--muted-strong)]">
                      {employee.correo || "Sin correo"}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {employee.telefono || "Sin telefono"}
                    </div>
                  </td>
                  <td
                    className="cursor-pointer py-4 text-[color:var(--muted-strong)]"
                    onClick={() => handleSelectEmployee(employee)}
                  >
                    {employee.role || "staff"}
                  </td>
                  <td
                    className="cursor-pointer py-4"
                    onClick={() => handleSelectEmployee(employee)}
                  >
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
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEdit(employee);
                        }}
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
                  No hay empleados registrados por ahora.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Horarios
            </p>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--muted-strong)]">
                {schedule.length}
              </span>
              {canManage && (
                <button
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!selectedEmployee}
                  onClick={openScheduleModal}
                  type="button"
                >
                  Anadir horario
                </button>
              )}
            </div>
          </div>

          {!selectedEmployee ? (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              Selecciona un empleado para ver sus horarios.
            </p>
          ) : detailsLoading ? (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              Cargando horarios...
            </p>
          ) : (
            <>
              {scheduleError && (
                <p className="mt-4 text-sm text-rose-200">{scheduleError}</p>
              )}
              {schedule.length ? (
                <ul className="mt-4 space-y-3">
                  {schedule.map((item) => {
                    const dayLabel =
                      WEEKDAY_LABELS[item.dia_semana] ||
                      `Dia ${item.dia_semana || "--"}`;
                    const workRange = formatTimeRange(
                      item.hora_entrada,
                      item.hora_salida
                    );
                    const breakRange = formatTimeRange(
                      item.hora_descanso_inicio,
                      item.hora_descanso_fin
                    );

                    return (
                      <li
                        key={item.uuid}
                        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-semibold text-[color:var(--foreground)]">
                            {dayLabel}
                          </span>
                          <span className="text-xs text-[color:var(--muted-strong)]">
                            {workRange}
                          </span>
                        </div>
                        {breakRange !== "--" && (
                          <p className="mt-1 text-xs text-[color:var(--muted)]">
                            Descanso {breakRange}
                          </p>
                        )}
                        {canManage && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-70"
                              disabled={scheduleSaving}
                              onClick={() => openScheduleModalForEdit(item)}
                              type="button"
                            >
                              Editar
                            </button>
                            <button
                              className="rounded-full border border-rose-400/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-400/70 disabled:cursor-not-allowed disabled:opacity-70"
                              disabled={scheduleSaving}
                              onClick={() => handleScheduleDelete(item)}
                              type="button"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-[color:var(--muted)]">
                  No hay horarios registrados para este empleado.
                </p>
              )}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Vacaciones
            </p>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--muted-strong)]">
                {vacations.length}
              </span>
              {canManage && (
                <button
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!selectedEmployee}
                  onClick={openVacationModal}
                  type="button"
                >
                  Anadir vacaciones
                </button>
              )}
            </div>
          </div>

          {!selectedEmployee ? (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              Selecciona un empleado para ver sus vacaciones.
            </p>
          ) : detailsLoading ? (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              Cargando vacaciones...
            </p>
          ) : (
            <>
              {vacationsError && (
                <p className="mt-4 text-sm text-rose-200">{vacationsError}</p>
              )}
              {vacations.length ? (
                <ul className="mt-4 space-y-3">
                  {vacations.map((item) => (
                    <li
                      key={item.uuid}
                      className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3"
                    >
                      <div className="text-sm font-semibold text-[color:var(--foreground)]">
                        {formatDate(item.fecha_inicio)}
                      </div>
                      <div className="text-xs text-[color:var(--muted)]">
                        hasta {formatDate(item.fecha_fin)}
                      </div>
                      {canManage && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={vacationSaving}
                            onClick={() => openVacationModalForEdit(item)}
                            type="button"
                          >
                            Editar
                          </button>
                          <button
                            className="rounded-full border border-rose-400/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-400/70 disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={vacationSaving}
                            onClick={() => handleVacationDelete(item)}
                            type="button"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-[color:var(--muted)]">
                  No hay vacaciones registradas para este empleado.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <ModalShell
        isOpen={Boolean(isFormOpen && canManage)}
        onClose={handleCancel}
        size="max-w-3xl"
      >
        <form onSubmit={handleSubmit}>
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
              Cerrar
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
      </ModalShell>

      <ModalShell
        isOpen={Boolean(isScheduleModalOpen && canManage)}
        onClose={closeScheduleModal}
        size="max-w-xl"
      >
        <form onSubmit={handleScheduleSubmit}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {scheduleEditingId ? "Editar horario" : "Nuevo horario"}
              </p>
              {selectedEmployee && (
                <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                  Empleado: {selectedEmployee.nombre}
                </p>
              )}
            </div>
            <button
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={closeScheduleModal}
              type="button"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[color:var(--foreground)]">
              Dia
              <select
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isScheduleFormDisabled}
                onChange={handleScheduleChange("dia_semana")}
                value={scheduleForm.dia_semana}
              >
                {WEEKDAY_LABELS.slice(1).map((label, index) => (
                  <option key={label} value={String(index + 1)}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Entrada
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isScheduleFormDisabled}
                onChange={handleScheduleChange("hora_entrada")}
                type="time"
                value={scheduleForm.hora_entrada}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Salida
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isScheduleFormDisabled}
                onChange={handleScheduleChange("hora_salida")}
                type="time"
                value={scheduleForm.hora_salida}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Descanso inicio
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isScheduleFormDisabled}
                onChange={handleScheduleChange("hora_descanso_inicio")}
                type="time"
                value={scheduleForm.hora_descanso_inicio}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Descanso fin
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isScheduleFormDisabled}
                onChange={handleScheduleChange("hora_descanso_fin")}
                type="time"
                value={scheduleForm.hora_descanso_fin}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-[linear-gradient(135deg,var(--supabase-green),var(--supabase-green-dark))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#04140b] shadow-[0_18px_40px_-24px_rgba(31,157,107,0.6)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isScheduleFormDisabled}
              type="submit"
            >
              {scheduleEditingId ? "Guardar horario" : "Agregar horario"}
            </button>
            <button
              className="rounded-2xl border border-[color:var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={closeScheduleModal}
              type="button"
            >
              Cancelar
            </button>
          </div>

          {!selectedEmployee && (
            <p className="mt-4 text-xs text-[color:var(--muted)]">
              Selecciona un empleado para gestionar horarios.
            </p>
          )}

          {scheduleError && (
            <div className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {scheduleError}
            </div>
          )}
        </form>
      </ModalShell>

      <ModalShell
        isOpen={Boolean(isVacationModalOpen && canManage)}
        onClose={closeVacationModal}
        size="max-w-xl"
      >
        <form onSubmit={handleVacationSubmit}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {vacationEditingId ? "Editar vacaciones" : "Nuevas vacaciones"}
              </p>
              {selectedEmployee && (
                <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                  Empleado: {selectedEmployee.nombre}
                </p>
              )}
            </div>
            <button
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={closeVacationModal}
              type="button"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[color:var(--foreground)]">
              Inicio
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isVacationFormDisabled}
                onChange={handleVacationChange("fecha_inicio")}
                type="date"
                value={vacationForm.fecha_inicio}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Fin
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isVacationFormDisabled}
                onChange={handleVacationChange("fecha_fin")}
                type="date"
                value={vacationForm.fecha_fin}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-[linear-gradient(135deg,var(--supabase-green),var(--supabase-green-dark))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#04140b] shadow-[0_18px_40px_-24px_rgba(31,157,107,0.6)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isVacationFormDisabled}
              type="submit"
            >
              {vacationEditingId ? "Guardar vacaciones" : "Agregar vacaciones"}
            </button>
            <button
              className="rounded-2xl border border-[color:var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={closeVacationModal}
              type="button"
            >
              Cancelar
            </button>
          </div>

          {!selectedEmployee && (
            <p className="mt-4 text-xs text-[color:var(--muted)]">
              Selecciona un empleado para gestionar vacaciones.
            </p>
          )}

          {vacationsError && (
            <div className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {vacationsError}
            </div>
          )}
        </form>
      </ModalShell>
    </section>
  );
}
