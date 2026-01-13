"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function AppointmentsCalendar({
  appointments = [],
  isLoading = false,
}) {
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
    </section>
  );
}
