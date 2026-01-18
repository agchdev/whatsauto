import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "../../lib/formatters";

const ITEMS_PER_PAGE = 8;

export default function UpcomingAppointmentsTable({ appointments, isLoading }) {
  const [page, setPage] = useState(1);
  const hasAppointments = appointments.length > 0;
  const totalPages = Math.max(1, Math.ceil(appointments.length / ITEMS_PER_PAGE));
  const paginatedAppointments = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return appointments.slice(start, start + ITEMS_PER_PAGE);
  }, [appointments, page]);
  const rangeStart = appointments.length ? (page - 1) * ITEMS_PER_PAGE + 1 : 0;
  const rangeEnd = Math.min(page * ITEMS_PER_PAGE, appointments.length);
  const showPagination = totalPages > 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Agenda
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            Futuras citas
          </h2>
        </div>
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--muted-strong)]">
          {appointments.length}
        </span>
      </div>

      <div className="mt-6 space-y-3 md:hidden">
        {isLoading ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
            Cargando citas...
          </div>
        ) : hasAppointments ? (
          paginatedAppointments.map((appointment) => (
            <div
              key={appointment.uuid}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Cliente
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                    {appointment.clientes?.nombre || "Sin cliente"}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {appointment.titulo || "Sin titulo"}
                  </p>
                </div>
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)]">
                  {appointment.estado || "pendiente"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Servicio
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                    {appointment.servicios?.nombre || "Sin servicio"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Inicio
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                    {formatDateTime(appointment.tiempo_inicio)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Fin
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                    {formatDateTime(appointment.tiempo_fin)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
            No hay citas futuras por ahora.
          </div>
        )}
      </div>

      <div className="mt-6 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            <tr>
              <th className="pb-3" scope="col">
                Cliente
              </th>
              <th className="pb-3" scope="col">
                Servicio
              </th>
              <th className="pb-3" scope="col">
                Inicio
              </th>
              <th className="pb-3" scope="col">
                Fin
              </th>
              <th className="pb-3" scope="col">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="py-4 text-[color:var(--muted)]" colSpan={5}>
                  Cargando citas...
                </td>
              </tr>
            ) : hasAppointments ? (
              paginatedAppointments.map((appointment) => (
                <tr
                  key={appointment.uuid}
                  className="border-t border-[color:var(--border)]"
                >
                  <td className="py-4">
                    <div className="font-semibold text-[color:var(--foreground)]">
                      {appointment.clientes?.nombre || "Sin cliente"}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {appointment.titulo || "Sin titulo"}
                    </div>
                  </td>
                  <td className="py-4 text-[color:var(--muted-strong)]">
                    {appointment.servicios?.nombre || "Sin servicio"}
                  </td>
                  <td className="py-4 text-[color:var(--muted-strong)]">
                    {formatDateTime(appointment.tiempo_inicio)}
                  </td>
                  <td className="py-4 text-[color:var(--muted-strong)]">
                    {formatDateTime(appointment.tiempo_fin)}
                  </td>
                  <td className="py-4 text-[color:var(--muted-strong)]">
                    {appointment.estado || "pendiente"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-4 text-[color:var(--muted)]" colSpan={5}>
                  No hay citas futuras por ahora.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
          <span>
            Mostrando {rangeStart}-{rangeEnd} de {appointments.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              Anterior
            </button>
            <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)]">
              {page} / {totalPages}
            </span>
            <button
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
