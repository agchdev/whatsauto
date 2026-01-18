import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "../../lib/formatters";

const ITEMS_PER_PAGE = 8;

const TYPE_LABELS = {
  confirmar: "Confirmar",
  eliminar: "Eliminar",
  espera: "Espera",
  modificar: "Modificar",
};

const STATUS_STYLES = {
  pendiente: "border-[color:var(--border)] text-[color:var(--muted-strong)]",
  usada: "border-emerald-300/40 text-emerald-200",
  expirada: "border-rose-400/40 text-rose-200",
};

const isExpired = (expiresAt) => {
  if (!expiresAt) return true;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() < Date.now();
};

const resolveStatus = (confirmation) => {
  if (confirmation?.used_at) return "usada";
  if (isExpired(confirmation?.expires_at)) return "expirada";
  return "pendiente";
};

export default function ConfirmationsTable({ confirmations = [], isLoading }) {
  const [page, setPage] = useState(1);
  const hasConfirmations = confirmations.length > 0;
  const totalPages = Math.max(1, Math.ceil(confirmations.length / ITEMS_PER_PAGE));
  const paginatedConfirmations = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return confirmations.slice(start, start + ITEMS_PER_PAGE);
  }, [confirmations, page]);
  const rangeStart = confirmations.length ? (page - 1) * ITEMS_PER_PAGE + 1 : 0;
  const rangeEnd = Math.min(page * ITEMS_PER_PAGE, confirmations.length);
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
            Confirmaciones
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            Historial de confirmaciones
          </h2>
        </div>
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--muted-strong)]">
          {confirmations.length}
        </span>
      </div>

      <div className="mt-6 space-y-3 md:hidden">
        {isLoading ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
            Cargando confirmaciones...
          </div>
        ) : hasConfirmations ? (
          paginatedConfirmations.map((confirmation) => {
            const status = resolveStatus(confirmation);
            const appointment = confirmation.citas;
            const clientName = appointment?.clientes?.nombre || "Sin cliente";
            const serviceName = appointment?.servicios?.nombre || "Sin servicio";
            const employeeName = appointment?.empleados?.nombre || "Sin empleado";
            const tipoLabel =
              TYPE_LABELS[confirmation.tipo] || confirmation.tipo || "--";

            return (
              <div
                key={confirmation.uuid}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Tipo
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                      {tipoLabel}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                      STATUS_STYLES[status] || STATUS_STYLES.pendiente
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Cliente
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                      {clientName}
                    </p>
                    <p className="text-xs text-[color:var(--muted)]">
                      {appointment?.titulo || serviceName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Empleado
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                      {employeeName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Inicio
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                      {formatDateTime(appointment?.tiempo_inicio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Expira
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                      {formatDateTime(confirmation.expires_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
            No hay confirmaciones registradas.
          </div>
        )}
      </div>

      <div className="mt-6 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            <tr>
              <th className="pb-3" scope="col">
                Tipo
              </th>
              <th className="pb-3" scope="col">
                Cliente
              </th>
              <th className="pb-3" scope="col">
                Empleado
              </th>
              <th className="pb-3" scope="col">
                Inicio
              </th>
              <th className="pb-3" scope="col">
                Estado
              </th>
              <th className="pb-3" scope="col">
                Expira
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="py-4 text-[color:var(--muted)]" colSpan={6}>
                  Cargando confirmaciones...
                </td>
              </tr>
            ) : hasConfirmations ? (
              paginatedConfirmations.map((confirmation) => {
                const status = resolveStatus(confirmation);
                const appointment = confirmation.citas;
                const clientName = appointment?.clientes?.nombre || "Sin cliente";
                const serviceName = appointment?.servicios?.nombre || "Sin servicio";
                const employeeName = appointment?.empleados?.nombre || "Sin empleado";
                const tipoLabel =
                  TYPE_LABELS[confirmation.tipo] || confirmation.tipo || "--";

                return (
                  <tr
                    key={confirmation.uuid}
                    className="border-t border-[color:var(--border)]"
                  >
                    <td className="py-4 text-[color:var(--muted-strong)]">
                      {tipoLabel}
                    </td>
                    <td className="py-4">
                      <div className="font-semibold text-[color:var(--foreground)]">
                        {clientName}
                      </div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {appointment?.titulo || serviceName}
                      </div>
                    </td>
                    <td className="py-4 text-[color:var(--muted-strong)]">
                      {employeeName}
                    </td>
                    <td className="py-4 text-[color:var(--muted-strong)]">
                      {formatDateTime(appointment?.tiempo_inicio)}
                    </td>
                    <td className="py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                          STATUS_STYLES[status] || STATUS_STYLES.pendiente
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="py-4 text-[color:var(--muted-strong)]">
                      {formatDateTime(confirmation.expires_at)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="py-4 text-[color:var(--muted)]" colSpan={6}>
                  No hay confirmaciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
          <span>
            Mostrando {rangeStart}-{rangeEnd} de {confirmations.length}
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
