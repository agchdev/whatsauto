"use client";

import { useState } from "react";
import { formatDateTime, formatDuration, formatPrice } from "../../lib/formatters";
import { getSupabaseClient } from "../../lib/supabaseClient";

const buildErrorMessage = (fallback, error) => {
  const details = error?.message || error?.details || "";
  return details ? `${fallback} (${details})` : fallback;
};

export default function ClientsPanel({ clients = [], isLoading }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const handleSelectClient = async (client) => {
    setSelectedClient(client);
    setHistory([]);
    setHistoryError("");
    setHistoryLoading(true);

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      setHistoryError(
        buildErrorMessage(
          "Faltan variables de entorno de Supabase.",
          error
        )
      );
      setHistoryLoading(false);
      return;
    }

    // Historial de citas del cliente seleccionado.
    // Ajusta el select si necesitas mas campos o relaciones.
    const { data, error } = await supabase
      .from("citas")
      .select(
        "uuid,estado,tiempo_inicio,tiempo_fin,servicios(nombre,precio,duracion),empleados(nombre)"
      )
      .eq("id_cliente", client.uuid)
      .order("tiempo_inicio", { ascending: false });

    if (error) {
      setHistoryError(
        buildErrorMessage("No pudimos cargar el historial.", error)
      );
      setHistoryLoading(false);
      return;
    }

    setHistory(data || []);
    setHistoryLoading(false);
  };

  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Clientes
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            Base de clientes
          </h2>
        </div>
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--muted-strong)]">
          {clients.length}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Lista
          </p>
          <div className="mt-4 max-h-[420px] overflow-y-auto">
            {isLoading ? (
              <p className="py-3 text-sm text-[color:var(--muted)]">
                Cargando clientes...
              </p>
            ) : clients.length ? (
              <ul className="space-y-2">
                {clients.map((client) => {
                  const isActive = selectedClient?.uuid === client.uuid;
                  return (
                    <li key={client.uuid}>
                      <button
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          isActive
                            ? "border-[color:var(--supabase-green)] bg-[color:var(--surface)] text-[color:var(--foreground)]"
                            : "border-[color:var(--border)] text-[color:var(--muted-strong)] hover:border-[color:var(--supabase-green)] hover:text-[color:var(--foreground)]"
                        }`}
                        onClick={() => handleSelectClient(client)}
                        type="button"
                      >
                        <span>
                          <span className="block font-semibold">
                            {client.nombre}
                          </span>
                          <span className="block text-xs text-[color:var(--muted)]">
                            {client.telefono || "Sin telefono"}
                          </span>
                        </span>
                        {isActive && (
                          <span className="h-2 w-2 rounded-full bg-[color:var(--supabase-green)] shadow-[0_0_12px_rgba(62,207,142,0.9)]" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-3 text-sm text-[color:var(--muted)]">
                No hay clientes registrados por ahora.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Historial de citas
            </p>
            <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--muted-strong)]">
              {history.length}
            </span>
          </div>

          {!selectedClient ? (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              Selecciona un cliente para ver su historial.
            </p>
          ) : historyLoading ? (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              Cargando historial...
            </p>
          ) : historyError ? (
            <p className="mt-4 text-sm text-rose-200">{historyError}</p>
          ) : history.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  <tr>
                    <th className="pb-3" scope="col">
                      Fecha
                    </th>
                    <th className="pb-3" scope="col">
                      Servicio
                    </th>
                    <th className="pb-3" scope="col">
                      Empleado
                    </th>
                    <th className="pb-3" scope="col">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((appointment) => (
                    <tr
                      key={appointment.uuid}
                      className="border-t border-[color:var(--border)]"
                    >
                      <td className="py-3 text-[color:var(--muted-strong)]">
                        {formatDateTime(appointment.tiempo_inicio)}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-[color:var(--foreground)]">
                          {appointment.servicios?.nombre || "Sin servicio"}
                        </div>
                        <div className="text-xs text-[color:var(--muted)]">
                          {formatDuration(appointment.servicios?.duracion)}
                          {" · "}
                          {formatPrice(appointment.servicios?.precio)}
                        </div>
                      </td>
                      <td className="py-3 text-[color:var(--muted-strong)]">
                        {appointment.empleados?.nombre || "Sin empleado"}
                      </td>
                      <td className="py-3 text-[color:var(--muted-strong)]">
                        {appointment.estado || "pendiente"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              No hay citas registradas para este cliente.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
