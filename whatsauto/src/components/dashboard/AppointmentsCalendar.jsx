"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabaseClient";

const WEEKDAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});
const TIME_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_STYLES = {
  confirmada:
    "border-[color:var(--supabase-green)] bg-[color:rgb(var(--supabase-green-rgb)/0.15)] text-[color:var(--supabase-green)]",
  pendiente:
    "border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--muted-strong)]",
  realizada:
    "border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--muted)]",
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date, amount) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const buildDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStatusStyle = (status) => {
  const normalized = (status || "").toLowerCase();
  return STATUS_STYLES[normalized] || STATUS_STYLES.pendiente;
};

const getAppointmentLabel = (appointment) =>
  appointment?.titulo ||
  appointment?.servicios?.nombre ||
  appointment?.clientes?.nombre ||
  "Cita";

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

const buildErrorMessage = (fallback, error) => {
  const details = error?.message || error?.details || "";
  return details ? `${fallback} (${details})` : fallback;
};

const pad2 = (value) => String(value).padStart(2, "0");

const formatLocalDate = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const formatLocalTime = (date) =>
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const createToken = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const emptyForm = {
  clientId: "",
  employeeId: "",
  serviceId: "",
  date: "",
  time: "",
  title: "",
  description: "",
};

export default function AppointmentsCalendar({
  appointments = [],
  clients = [],
  employees = [],
  services = [],
  currentEmployee,
  companyId,
  isLoading = false,
  onRefresh,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState(emptyForm);
  const [formStatus, setFormStatus] = useState({ type: "idle", message: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [createdLink, setCreatedLink] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const today = useMemo(() => new Date(), []);
  const normalizedAppointments = useMemo(
    () =>
      appointments
        .map((appointment) => {
          const start = new Date(appointment?.tiempo_inicio);
          if (Number.isNaN(start.getTime())) return null;
          return { ...appointment, start };
        })
        .filter(Boolean)
        .sort((left, right) => left.start.getTime() - right.start.getTime()),
    [appointments]
  );
  const appointmentsByDay = useMemo(
    () =>
      normalizedAppointments.reduce((acc, appointment) => {
        const key = buildDateKey(appointment.start);
        if (!acc[key]) acc[key] = [];
        acc[key].push(appointment);
        return acc;
      }, {}),
    [normalizedAppointments]
  );
  const appointmentsByMonth = useMemo(
    () =>
      normalizedAppointments.reduce((acc, appointment) => {
        const key = `${appointment.start.getFullYear()}-${appointment.start.getMonth()}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(appointment);
        return acc;
      }, {}),
    [normalizedAppointments]
  );
  const minMonth = useMemo(() => startOfMonth(today), [today]);
  const maxMonth = useMemo(() => {
    if (!normalizedAppointments.length) return minMonth;
    const lastAppointment = normalizedAppointments[normalizedAppointments.length - 1];
    const lastMonth = startOfMonth(lastAppointment.start);
    return lastMonth.getTime() < minMonth.getTime() ? minMonth : lastMonth;
  }, [normalizedAppointments, minMonth]);
  const [viewMonth, setViewMonth] = useState(() => {
    const initial = normalizedAppointments[0]?.start || today;
    const initialMonth = startOfMonth(initial);
    if (initialMonth.getTime() < minMonth.getTime()) return minMonth;
    if (initialMonth.getTime() > maxMonth.getTime()) return maxMonth;
    return initialMonth;
  });

  useEffect(() => {
    if (!normalizedAppointments.length) {
      if (viewMonth.getTime() !== minMonth.getTime()) {
        setViewMonth(minMonth);
      }
      return;
    }

    const viewTime = viewMonth.getTime();
    const minTime = minMonth.getTime();
    const maxTime = maxMonth.getTime();

    if (viewTime < minTime) {
      setViewMonth(minMonth);
      return;
    }
    if (viewTime > maxTime) {
      setViewMonth(maxMonth);
      return;
    }

    const viewMonthKey = `${viewMonth.getFullYear()}-${viewMonth.getMonth()}`;
    const viewHasAppointments = Boolean(appointmentsByMonth[viewMonthKey]);
    const firstMonth = startOfMonth(normalizedAppointments[0].start);
    if (!viewHasAppointments && viewTime === minTime && firstMonth > viewMonth) {
      setViewMonth(firstMonth);
    }
  }, [appointmentsByMonth, maxMonth, minMonth, normalizedAppointments, viewMonth]);

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const dayOffset = index - startOffset + 1;
      const date = new Date(year, month, dayOffset);
      const dateKey = buildDateKey(date);
      const isCurrentMonth = date.getMonth() === month;
      const dayAppointments = isCurrentMonth ? appointmentsByDay[dateKey] || [] : [];

      return {
        date,
        dateKey,
        dayNumber: date.getDate(),
        isCurrentMonth,
        isToday: isSameDay(date, today),
        appointments: dayAppointments,
      };
    });
  }, [appointmentsByDay, today, viewMonth]);

  const monthLabel = MONTH_FORMATTER.format(viewMonth);
  const canGoPrev = viewMonth.getTime() > minMonth.getTime();
  const canGoNext = viewMonth.getTime() < maxMonth.getTime();
  const hasAppointments = normalizedAppointments.length > 0;
  const employeeOptions = useMemo(() => {
    if (!currentEmployee || currentEmployee.role === "boss") return employees;
    const match = employees.find((employee) => employee.uuid === currentEmployee.id);
    if (match) return [match];
    if (currentEmployee.id) {
      return [{ uuid: currentEmployee.id, nombre: currentEmployee.name || "Empleado" }];
    }
    return [];
  }, [currentEmployee, employees]);
  const selectedService = services.find(
    (service) => service.uuid === formState.serviceId
  );
  const selectedDuration = Number(selectedService?.duracion || 0);
  const endTimeLabel = useMemo(() => {
    if (!formState.date || !formState.time) return "--";
    if (!Number.isFinite(selectedDuration) || selectedDuration <= 0) return "--";
    const start = new Date(`${formState.date}T${formState.time}`);
    if (Number.isNaN(start.getTime())) return "--";
    const end = new Date(start.getTime());
    end.setMinutes(end.getMinutes() + selectedDuration);
    return TIME_FORMATTER.format(end);
  }, [formState.date, formState.time, selectedDuration]);

  const openModal = () => {
    const now = new Date();
    const defaultEmployeeId = employeeOptions[0]?.uuid || "";
    const defaultClientId = clients[0]?.uuid || "";
    const defaultServiceId = services[0]?.uuid || "";
    setFormState({
      clientId: defaultClientId,
      employeeId: defaultEmployeeId,
      serviceId: defaultServiceId,
      date: formatLocalDate(now),
      time: formatLocalTime(now),
      title: "",
      description: "",
    });
    setFormStatus({ type: "idle", message: "" });
    setCreatedLink("");
    setCopyStatus("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormStatus({ type: "idle", message: "" });
    setCreatedLink("");
    setCopyStatus("");
  };

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCopyLink = async () => {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setCopyStatus("Enlace copiado.");
    } catch (error) {
      setCopyStatus("No se pudo copiar el enlace.");
    }
  };

  const handleCreateAppointment = async (event) => {
    event.preventDefault();

    if (!companyId) {
      setFormStatus({
        type: "error",
        message: "Falta el identificador de empresa.",
      });
      return;
    }

    if (!formState.clientId || !formState.employeeId || !formState.serviceId) {
      setFormStatus({
        type: "error",
        message: "Selecciona cliente, empleado y servicio.",
      });
      return;
    }

    if (!formState.date || !formState.time) {
      setFormStatus({
        type: "error",
        message: "Selecciona fecha y hora de inicio.",
      });
      return;
    }

    if (!Number.isFinite(selectedDuration) || selectedDuration <= 0) {
      setFormStatus({
        type: "error",
        message: "El servicio seleccionado no tiene duracion valida.",
      });
      return;
    }

    const start = new Date(`${formState.date}T${formState.time}`);
    if (Number.isNaN(start.getTime())) {
      setFormStatus({
        type: "error",
        message: "La fecha u hora no son validas.",
      });
      return;
    }

    const end = new Date(start.getTime());
    end.setMinutes(end.getMinutes() + selectedDuration);

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      setFormStatus({
        type: "error",
        message: buildErrorMessage(
          "Faltan variables de entorno de Supabase.",
          error
        ),
      });
      return;
    }

    setIsSaving(true);
    setFormStatus({ type: "loading", message: "Creando cita..." });
    setCreatedLink("");
    setCopyStatus("");

    const { data: appointment, error: appointmentError } = await supabase
      .from("citas")
      .insert({
        id_empresa: companyId,
        id_empleado: formState.employeeId,
        id_cliente: formState.clientId,
        id_servicio: formState.serviceId,
        titulo: formState.title.trim() || null,
        descripcion: formState.description.trim() || null,
        tiempo_inicio: start.toISOString(),
        tiempo_fin: end.toISOString(),
        estado: "pendiente",
      })
      .select("uuid,tiempo_inicio")
      .single();

    if (appointmentError) {
      setFormStatus({
        type: "error",
        message: buildErrorMessage(
          "No pudimos crear la cita.",
          appointmentError
        ),
      });
      setIsSaving(false);
      return;
    }

    const token = createToken();
    const { error: confirmationError } = await supabase
      .from("confirmaciones")
      .insert({
        id_cita: appointment.uuid,
        token_hash: token,
        expires_at: appointment.tiempo_inicio,
        tipo: "confirmar",
      });

    if (confirmationError) {
      setFormStatus({
        type: "error",
        message: buildErrorMessage(
          "La cita se creo, pero no pudimos generar la confirmacion.",
          confirmationError
        ),
      });
      setIsSaving(false);
      return;
    }

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const link = origin ? `${origin}/confirmar/${token}` : token;

    setCreatedLink(link);
    setFormStatus({
      type: "success",
      message: "Cita creada. Confirmacion generada.",
    });
    setIsSaving(false);
    onRefresh?.();
  };

  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Citas
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            Calendario de citas
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--muted-strong)]">
            {normalizedAppointments.length}
          </span>
          <button
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isLoading}
            onClick={openModal}
            type="button"
          >
            Nueva cita
          </button>
          <div className="flex items-center gap-2">
            <button
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canGoPrev}
              onClick={() => setViewMonth(addMonths(viewMonth, -1))}
              type="button"
            >
              Anterior
            </button>
            <span className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)]">
              {monthLabel}
            </span>
            <button
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canGoNext}
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {!isLoading && !hasAppointments && (
        <p className="mt-4 text-sm text-[color:var(--muted)]">
          No hay citas proximas por ahora.
        </p>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-6 text-sm text-[color:var(--muted)]">
            Cargando calendario...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--border)]">
            {WEEKDAYS.map((label) => (
              <div
                key={label}
                className="bg-[color:var(--surface-strong)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
              >
                {label}
              </div>
            ))}
            {calendarDays.map((day) => {
              const visibleAppointments = day.appointments.slice(0, 2);
              const extraCount = day.appointments.length - visibleAppointments.length;
              const dayTextColor = day.isCurrentMonth
                ? "text-[color:var(--foreground)]"
                : "text-[color:var(--muted)]";
              const dayBackground = day.isCurrentMonth
                ? "bg-[color:var(--surface)]"
                : "bg-[color:var(--surface-muted)]";
              const dayNumberColor = day.isToday
                ? "text-[color:var(--supabase-green)]"
                : "text-[color:var(--muted-strong)]";

              return (
                <div
                  key={day.dateKey}
                  className={`min-h-[96px] px-2 py-2 text-xs ${dayBackground} ${dayTextColor}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-semibold ${dayNumberColor}`}>
                      {day.dayNumber}
                    </span>
                    {day.isToday && (
                      <span className="h-2 w-2 rounded-full bg-[color:var(--supabase-green)] shadow-[0_0_12px_rgba(62,207,142,0.8)]" />
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    {visibleAppointments.map((appointment) => {
                      const timeLabel = TIME_FORMATTER.format(appointment.start);
                      const label = getAppointmentLabel(appointment);
                      const clientName =
                        appointment?.clientes?.nombre || "Sin cliente";
                      const serviceName =
                        appointment?.servicios?.nombre || "Sin servicio";
                      const status = appointment?.estado || "pendiente";
                      const title = `${timeLabel} | ${label} | ${clientName} | ${serviceName} | ${status}`;

                      return (
                        <div
                          key={appointment.uuid}
                          className={`flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1 text-[10px] ${getStatusStyle(
                            appointment.estado
                          )}`}
                          title={title}
                        >
                          <span className="font-semibold">{timeLabel}</span>
                          <span className="truncate">{label}</span>
                        </div>
                      );
                    })}
                    {extraCount > 0 && (
                      <div className="text-[10px] text-[color:var(--muted)]">
                        +{extraCount} mas
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ModalShell isOpen={isModalOpen} onClose={closeModal} size="max-w-3xl">
        <form onSubmit={handleCreateAppointment}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Nueva cita
              </p>
              <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                Completa los datos y se generara una confirmacion.
              </p>
            </div>
            <button
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={closeModal}
              type="button"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[color:var(--foreground)]">
              Cliente
              <select
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("clientId")}
                required
                value={formState.clientId}
              >
                <option value="">Selecciona un cliente</option>
                {clients.map((client) => (
                  <option key={client.uuid} value={client.uuid}>
                    {client.nombre} {client.telefono ? `(${client.telefono})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Empleado
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

            <label className="text-sm text-[color:var(--foreground)]">
              Servicio
              <select
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("serviceId")}
                required
                value={formState.serviceId}
              >
                <option value="">Selecciona un servicio</option>
                {services.map((service) => (
                  <option key={service.uuid} value={service.uuid}>
                    {service.nombre} ({service.duracion} min)
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Fecha
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("date")}
                required
                type="date"
                value={formState.date}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Hora inicio
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("time")}
                required
                type="time"
                value={formState.time}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[color:var(--foreground)]">
              Titulo (opcional)
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("title")}
                placeholder="Corte y barba"
                type="text"
                value={formState.title}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Descripcion (opcional)
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("description")}
                placeholder="Notas internas"
                type="text"
                value={formState.description}
              />
            </label>
          </div>

          {selectedService && (
            <p className="mt-4 text-xs text-[color:var(--muted)]">
              Duracion del servicio: {selectedDuration} min. Fin estimado:{" "}
              {endTimeLabel}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-[linear-gradient(135deg,var(--supabase-green),var(--supabase-green-dark))] px-5 py-3 text-sm font-semibold text-[#04140b] shadow-[0_18px_40px_-24px_rgba(31,157,107,0.6)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              Crear cita
            </button>
            <button
              className="rounded-2xl border border-[color:var(--border)] px-5 py-3 text-sm font-semibold text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={closeModal}
              type="button"
            >
              Cancelar
            </button>
          </div>

          {formStatus.message && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                formStatus.type === "error"
                  ? "border-rose-300/30 bg-rose-500/10 text-rose-200"
                  : formStatus.type === "success"
                  ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-200"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted)]"
              }`}
            >
              {formStatus.message}
            </div>
          )}

          {createdLink && (
            <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm text-[color:var(--muted-strong)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Enlace de confirmacion
              </p>
              <p className="mt-2 break-all text-[color:var(--foreground)]">
                {createdLink}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-2xl border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
                  onClick={handleCopyLink}
                  type="button"
                >
                  Copiar enlace
                </button>
                {copyStatus && (
                  <span className="text-xs text-[color:var(--muted)]">
                    {copyStatus}
                  </span>
                )}
              </div>
            </div>
          )}
        </form>
      </ModalShell>
    </section>
  );
}
