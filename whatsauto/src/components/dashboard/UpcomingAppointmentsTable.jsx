import { formatDateTime } from "../../lib/formatters";

export default function UpcomingAppointmentsTable({ appointments, isLoading }) {
  const hasAppointments = appointments.length > 0;

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

      <div className="mt-6 overflow-x-auto">
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
              appointments.map((appointment) => (
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
    </section>
  );
}
