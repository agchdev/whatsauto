import { formatDateTime } from "../../lib/formatters";

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
  const hasConfirmations = confirmations.length > 0;

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

      <div className="mt-6 overflow-x-auto">
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
              confirmations.map((confirmation) => {
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
    </section>
  );
}
