"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime, formatDuration, formatPrice } from "../../lib/formatters";
import { getSupabaseClient } from "../../lib/supabaseClient";

const CLIENTS_PAGE_SIZE = 8;

const buildErrorMessage = (fallback, error) => {
  const details = error?.message || error?.details || "";
  return details ? `${fallback} (${details})` : fallback;
};

const ModalShell = ({ isOpen, onClose, children, size = "max-w-xl" }) => {
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

const emptyForm = {
  name: "",
  phone: "",
};

export default function ClientsPanel({ clients = [], isLoading, onRefresh }) {
  const [clientList, setClientList] = useState(clients);
  const [selectedClient, setSelectedClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editStatus, setEditStatus] = useState({ type: "idle", message: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientPage, setClientPage] = useState(1);
  const totalClientPages = Math.max(
    1,
    Math.ceil(clientList.length / CLIENTS_PAGE_SIZE)
  );
  const visibleClients = useMemo(() => {
    const start = (clientPage - 1) * CLIENTS_PAGE_SIZE;
    return clientList.slice(start, start + CLIENTS_PAGE_SIZE);
  }, [clientList, clientPage]);
  const clientRangeStart = clientList.length
    ? (clientPage - 1) * CLIENTS_PAGE_SIZE + 1
    : 0;
  const clientRangeEnd = Math.min(
    clientPage * CLIENTS_PAGE_SIZE,
    clientList.length
  );
  const showClientPagination = totalClientPages > 1;

  useEffect(() => {
    setClientList(clients);
    if (selectedClient) {
      const updated = clients.find((client) => client.uuid === selectedClient.uuid);
      if (updated) {
        setSelectedClient(updated);
      }
    }
  }, [clients, selectedClient]);

  useEffect(() => {
    if (clientPage > totalClientPages) {
      setClientPage(totalClientPages);
    }
  }, [clientPage, totalClientPages]);

  const handleSelectClient = async (client) => {
    setSelectedClient(client);
    setHistory([]);
    setHistoryError("");
    setHistoryLoading(true);
    setEditOpen(false);
    setEditingClient(null);
    setEditStatus({ type: "idle", message: "" });

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

  const handleEditOpen = () => {
    if (!selectedClient) return;
    setEditingClient(selectedClient);
    setEditForm({
      name: selectedClient.nombre || "",
      phone: selectedClient.telefono || "",
    });
    setEditStatus({ type: "idle", message: "" });
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingClient(null);
    setEditForm(emptyForm);
    setEditStatus({ type: "idle", message: "" });
  };

  const handleEditChange = (field) => (event) => {
    setEditForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!editingClient?.uuid) {
      setEditStatus({
        type: "error",
        message: "Selecciona un cliente para editar.",
      });
      return;
    }

    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setEditStatus({ type: "error", message: "El nombre es obligatorio." });
      return;
    }

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      setEditStatus({
        type: "error",
        message: buildErrorMessage(
          "Faltan variables de entorno de Supabase.",
          error
        ),
      });
      return;
    }

    setEditSaving(true);
    setEditStatus({ type: "loading", message: "Guardando cliente..." });

    const payload = {
      nombre: trimmedName,
      telefono: editForm.phone.trim() || null,
    };

    const { data, error } = await supabase
      .from("clientes")
      .update(payload)
      .eq("uuid", editingClient.uuid)
      .select("uuid,nombre,telefono")
      .single();

    if (error) {
      setEditStatus({
        type: "error",
        message:
          error.message || "No pudimos actualizar el cliente. Intenta otra vez.",
      });
      setEditSaving(false);
      return;
    }

    const updatedClient = data || {
      uuid: editingClient.uuid,
      nombre: payload.nombre,
      telefono: payload.telefono,
    };

    setClientList((prev) =>
      prev.map((client) =>
        client.uuid === updatedClient.uuid ? { ...client, ...updatedClient } : client
      )
    );
    setSelectedClient((prev) =>
      prev?.uuid === updatedClient.uuid ? { ...prev, ...updatedClient } : prev
    );

    setEditSaving(false);
    handleEditClose();
    onRefresh?.();
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
          {clientList.length}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Lista
          </p>
          <div className="mt-4 max-h-none overflow-visible md:max-h-[420px] md:overflow-y-auto">
            {isLoading ? (
              <p className="py-3 text-sm text-[color:var(--muted)]">
                Cargando clientes...
              </p>
            ) : clientList.length ? (
              <ul className="space-y-2">
                {visibleClients.map((client) => {
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
          {showClientPagination && !isLoading && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
              <span>
                Mostrando {clientRangeStart}-{clientRangeEnd} de{" "}
                {clientList.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-[color:var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={clientPage === 1}
                  onClick={() => setClientPage((prev) => Math.max(1, prev - 1))}
                  type="button"
                >
                  Anterior
                </button>
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)]">
                  {clientPage} / {totalClientPages}
                </span>
                <button
                  className="rounded-full border border-[color:var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={clientPage === totalClientPages}
                  onClick={() =>
                    setClientPage((prev) => Math.min(totalClientPages, prev + 1))
                  }
                  type="button"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Historial de citas
            </p>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--muted-strong)]">
                {history.length}
              </span>
              <button
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={!selectedClient}
                onClick={handleEditOpen}
                type="button"
              >
                Editar cliente
              </button>
            </div>
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
            <>
              <div className="mt-4 space-y-3 md:hidden">
                {history.map((appointment) => (
                  <div
                    key={appointment.uuid}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                          Fecha
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                          {formatDateTime(appointment.tiempo_inicio)}
                        </p>
                      </div>
                      <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)]">
                        {appointment.estado || "pendiente"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                          Servicio
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                          {appointment.servicios?.nombre || "Sin servicio"}
                        </p>
                        <p className="text-xs text-[color:var(--muted)]">
                          {formatDuration(appointment.servicios?.duracion)}
                          {" · "}
                          {formatPrice(appointment.servicios?.precio)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                          Empleado
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                          {appointment.empleados?.nombre || "Sin empleado"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 hidden overflow-x-auto md:block">
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
            </>
          ) : (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              No hay citas registradas para este cliente.
            </p>
          )}
        </div>
      </div>

      <ModalShell isOpen={editOpen} onClose={handleEditClose}>
        <form onSubmit={handleEditSubmit}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Editar cliente
              </p>
              {editingClient && (
                <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                  {editingClient.nombre || "Cliente"}
                </p>
              )}
            </div>
            <button
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={handleEditClose}
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
                onChange={handleEditChange("name")}
                placeholder="Nombre"
                required
                type="text"
                value={editForm.name}
              />
            </label>

            <label className="text-sm text-[color:var(--foreground)]">
              Telefono
              <input
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleEditChange("phone")}
                placeholder="600 000 000"
                type="text"
                value={editForm.phone}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-[linear-gradient(135deg,var(--supabase-green),var(--supabase-green-dark))] px-5 py-3 text-sm font-semibold text-[#04140b] shadow-[0_18px_40px_-24px_rgba(31,157,107,0.6)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={editSaving}
              type="submit"
            >
              Guardar cambios
            </button>
            <button
              className="rounded-2xl border border-[color:var(--border)] px-5 py-3 text-sm font-semibold text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={handleEditClose}
              type="button"
            >
              Cancelar
            </button>
          </div>

          {editStatus.message && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                editStatus.type === "error"
                  ? "border-rose-300/30 bg-rose-500/10 text-rose-200"
                  : editStatus.type === "success"
                  ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-200"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted)]"
              }`}
            >
              {editStatus.message}
            </div>
          )}
        </form>
      </ModalShell>
    </section>
  );
}
