"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "../../lib/formatters";

const emptyForm = {
  clientId: "",
  appointmentId: "",
};

const AVAILABLE_STATES = new Set(["rechazada", "cancelada"]);
const STATE_LABELS = {
  confirmada: "Cliente original confirmado",
  pendiente: "Cliente original pendiente",
  rechazada: "Cliente original se quito",
  cancelada: "Cliente original se quito",
  realizada: "Cita realizada",
};
const WAITLIST_STATUS_LABELS = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  rechazada: "Rechazada",
};
const ASSIGN_BUTTON_STYLES = {
  available:
    "border-[color:var(--supabase-green)] bg-[color:rgb(var(--supabase-green-rgb)/0.18)] text-[color:var(--supabase-green)] hover:bg-[color:rgb(var(--supabase-green-rgb)/0.28)]",
  unavailable: "border-rose-400/40 bg-rose-500/10 text-rose-200",
};
const WAITLIST_PAGE_SIZE = 6;

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

const formatAppointmentTitle = (appointment) =>
  appointment?.titulo ||
  appointment?.servicios?.nombre ||
  "Cita";

const formatAppointmentLabel = (appointment) => {
  if (!appointment) return "Cita sin datos";
  const timeLabel = formatDateTime(appointment.tiempo_inicio);
  const title = formatAppointmentTitle(appointment);
  const employeeName = appointment?.empleados?.nombre;
  return [timeLabel, title, employeeName].filter(Boolean).join(" · ");
};

const sortByCreated = (left, right) => {
  const leftTime = new Date(left?.created_at || 0).getTime();
  const rightTime = new Date(right?.created_at || 0).getTime();
  return rightTime - leftTime;
};

const normalizeStatus = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const getAssignButtonClass = (canAssign) =>
  `rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
    canAssign ? ASSIGN_BUTTON_STYLES.available : ASSIGN_BUTTON_STYLES.unavailable
  }`;

export default function WaitlistPanel({
  accessToken,
  waitlist = [],
  clients = [],
  isLoading,
  onRefresh,
}) {
  const [waitlistEntries, setWaitlistEntries] = useState(waitlist);
  const [appointmentOptions, setAppointmentOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState("");
  const [formState, setFormState] = useState(emptyForm);
  const [editingEntry, setEditingEntry] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [waitlistPage, setWaitlistPage] = useState(1);

  useEffect(() => {
    setWaitlistEntries(waitlist);
  }, [waitlist]);

  const orderedWaitlist = useMemo(
    () => [...waitlistEntries].sort(sortByCreated),
    [waitlistEntries]
  );
  const waitlistTotalPages = Math.max(
    1,
    Math.ceil(orderedWaitlist.length / WAITLIST_PAGE_SIZE)
  );
  const paginatedWaitlist = useMemo(() => {
    const start = (waitlistPage - 1) * WAITLIST_PAGE_SIZE;
    return orderedWaitlist.slice(start, start + WAITLIST_PAGE_SIZE);
  }, [orderedWaitlist, waitlistPage]);
  const waitlistRangeStart = orderedWaitlist.length
    ? (waitlistPage - 1) * WAITLIST_PAGE_SIZE + 1
    : 0;
  const waitlistRangeEnd = Math.min(
    waitlistPage * WAITLIST_PAGE_SIZE,
    orderedWaitlist.length
  );
  const showWaitlistPagination = waitlistTotalPages > 1;

  useEffect(() => {
    if (waitlistPage > waitlistTotalPages) {
      setWaitlistPage(waitlistTotalPages);
    }
  }, [waitlistPage, waitlistTotalPages]);

  const ensureAppointmentOptions = async (currentAppointment) => {
    if (optionsLoading) return [];
    if (appointmentOptions.length) {
      if (
        currentAppointment &&
        !appointmentOptions.some((item) => item.uuid === currentAppointment.uuid)
      ) {
        const updated = [currentAppointment, ...appointmentOptions];
        setAppointmentOptions(updated);
        return updated;
      }
      return appointmentOptions;
    }

    setOptionsLoading(true);
    setOptionsError("");

    if (!accessToken) {
      setOptionsError("Sesion invalida. Inicia sesion otra vez.");
      setOptionsLoading(false);
      return [];
    }

    const response = await fetch("/api/waitlist/options", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.status !== "ok") {
      setOptionsError(payload.message || "No pudimos cargar las citas.");
      setOptionsLoading(false);
      return [];
    }

    let options = payload.appointments || [];
    if (
      currentAppointment &&
      !options.some((item) => item.uuid === currentAppointment.uuid)
    ) {
      options = [currentAppointment, ...options];
    }

    setAppointmentOptions(options);
    setOptionsLoading(false);
    setFormState((prev) => ({
      ...prev,
      appointmentId: prev.appointmentId || options[0]?.uuid || "",
    }));
    return options;
  };

  const openCreate = async () => {
    setEditingEntry(null);
    setFormState({
      clientId: clients[0]?.uuid || "",
      appointmentId: "",
    });
    setStatus({ type: "idle", message: "" });
    setModalOpen(true);
    await ensureAppointmentOptions();
  };

  const openEdit = async (entry) => {
    setEditingEntry(entry);
    setFormState({
      clientId: entry?.id_cliente || entry?.clientes?.uuid || "",
      appointmentId: entry?.id_cita || entry?.citas?.uuid || "",
    });
    setStatus({ type: "idle", message: "" });
    setModalOpen(true);
    await ensureAppointmentOptions(entry?.citas);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEntry(null);
    setFormState(emptyForm);
    setStatus({ type: "idle", message: "" });
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    setGeneratedLink("");
    setCopyStatus("");
  };

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopyStatus("Enlace copiado.");
    } catch (error) {
      setCopyStatus("No se pudo copiar el enlace.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formState.clientId || !formState.appointmentId) {
      setStatus({
        type: "error",
        message: "Selecciona una cita y un cliente.",
      });
      return;
    }

    if (!accessToken) {
      setStatus({
        type: "error",
        message: "Sesion invalida. Inicia sesion otra vez.",
      });
      return;
    }

    setIsSaving(true);
    setStatus({ type: "loading", message: "Guardando espera..." });

    const response = await fetch("/api/waitlist", {
      method: editingEntry ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entryId: editingEntry?.uuid,
        appointmentId: formState.appointmentId,
        clientId: formState.clientId,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.status !== "ok") {
      setStatus({
        type: "error",
        message: payload.message || "No pudimos guardar la espera.",
      });
      setIsSaving(false);
      return;
    }

    const entry = payload.entry;
    if (entry) {
      setWaitlistEntries((prev) => {
        if (editingEntry) {
          return prev.map((item) => (item.uuid === entry.uuid ? entry : item));
        }
        return [entry, ...prev];
      });
    }

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const token = typeof payload.token === "string" ? payload.token : "";
    if (!editingEntry && token) {
      setGeneratedLink(origin && token ? `${origin}/espera/${token}` : token);
      setLinkModalOpen(true);
    }

    setStatus({
      type: "success",
      message:
        payload.message ||
        (editingEntry
          ? "Espera actualizada correctamente."
          : "Cliente anadido a la lista de espera."),
    });
    setIsSaving(false);
    closeModal();
    onRefresh?.();
  };

  const handleDelete = async (entry) => {
    if (!entry?.uuid) return;
    if (!window.confirm("Eliminar esta espera?")) return;

    setStatus({ type: "idle", message: "" });

    if (!accessToken) {
      setStatus({
        type: "error",
        message: "Sesion invalida. Inicia sesion otra vez.",
      });
      return;
    }

    const response = await fetch("/api/waitlist", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entryId: entry.uuid }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.status !== "ok") {
      setStatus({
        type: "error",
        message: payload.message || "No pudimos eliminar la espera.",
      });
      return;
    }

    setWaitlistEntries((prev) =>
      prev.filter((item) => item.uuid !== entry.uuid)
    );
    onRefresh?.();
  };

  const handleAssign = async (entry) => {
    if (!entry?.uuid || !entry?.id_cita) return;
    const statusValue = normalizeStatus(entry?.citas?.estado);
    if (!AVAILABLE_STATES.has(statusValue)) {
      setStatus({
        type: "error",
        message: "La cita original sigue confirmada o pendiente.",
      });
      return;
    }

    const clientId = entry?.id_cliente || entry?.clientes?.uuid;
    if (!clientId) {
      setStatus({
        type: "error",
        message: "No encontramos el cliente de la lista de espera.",
      });
      return;
    }

    setAssigningId(entry.uuid);
    setStatus({ type: "loading", message: "Asignando cliente a la cita..." });

    if (!accessToken) {
      setStatus({
        type: "error",
        message: "Sesion invalida. Inicia sesion otra vez.",
      });
      setAssigningId(null);
      return;
    }

    const response = await fetch("/api/waitlist/assign", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entryId: entry.uuid }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.status !== "ok") {
      setStatus({
        type: "error",
        message: payload.message || "No pudimos actualizar la cita.",
      });
      setAssigningId(null);
      return;
    }

    setWaitlistEntries((prev) =>
      prev.filter((item) => item.uuid !== entry.uuid)
    );

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const token = typeof payload.token === "string" ? payload.token : "";
    setGeneratedLink(origin && token ? `${origin}/confirmar/${token}` : token);
    setLinkModalOpen(true);
    setStatus({
      type: "success",
      message: payload.message || "Cliente asignado. Confirmacion generada.",
    });
    setAssigningId(null);
    onRefresh?.();
  };

  const hasWaitlist = orderedWaitlist.length > 0;

  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Lista de espera
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            Clientes en espera
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--muted-strong)]">
            {waitlistEntries.length}
          </span>
          <button
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
            onClick={openCreate}
            type="button"
          >
            Anadir a espera
          </button>
        </div>
      </div>

      {!modalOpen && status.message && (
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

      <div className="mt-6">
        <div className="space-y-3 md:hidden">
          {isLoading ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
              Cargando lista de espera...
            </div>
          ) : hasWaitlist ? (
            paginatedWaitlist.map((entry) => {
              const appointment = entry?.citas;
              const waitClient = entry?.clientes;
              const appointmentTitle = formatAppointmentTitle(appointment);
              const appointmentTime = formatDateTime(appointment?.tiempo_inicio);
              const employeeName =
                appointment?.empleados?.nombre || "Sin empleado";
              const rawStatus =
                normalizeStatus(appointment?.estado) || "pendiente";
              const originalLabel =
                STATE_LABELS[rawStatus] || "Estado desconocido";
              const waitStatus = normalizeStatus(entry?.estado) || "pendiente";
              const waitStatusLabel =
                WAITLIST_STATUS_LABELS[waitStatus] || waitStatus;
              const canAssign = AVAILABLE_STATES.has(rawStatus);
              const assignTitle = canAssign
                ? "Disponible para pasar a cita"
                : "La cita original aun no esta libre";

              return (
                <div
                  key={entry.uuid}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Cliente
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                        {waitClient?.nombre || "Sin cliente"}
                      </p>
                      <p className="text-xs text-[color:var(--muted)]">
                        {waitClient?.telefono || "Sin telefono"}
                      </p>
                    </div>
                    <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)]">
                      {formatDateTime(entry?.created_at)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Cita
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                        {appointmentTitle}
                      </p>
                      <p className="text-xs text-[color:var(--muted)]">
                        {appointmentTime}
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
                        Cliente original
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                        {originalLabel}
                      </p>
                      <p className="text-xs text-[color:var(--muted)]">
                        Estado cita: {rawStatus}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Estado espera
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                        {waitStatusLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className={`${getAssignButtonClass(
                        canAssign
                      )} disabled:cursor-not-allowed disabled:opacity-80`}
                      disabled={!canAssign || assigningId === entry.uuid}
                      onClick={() => handleAssign(entry)}
                      title={assignTitle}
                      type="button"
                    >
                      {assigningId === entry.uuid ? "Asignando..." : "Pasar a cita"}
                    </button>
                    <button
                      className="rounded-full border border-[color:var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
                      onClick={() => openEdit(entry)}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-full border border-rose-400/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-400/70"
                      onClick={() => handleDelete(entry)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
              No hay clientes en lista de espera.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[180px]" />
              <col className="w-[280px]" />
              <col className="w-[140px]" />
              <col className="w-[220px]" />
              <col className="w-[140px]" />
              <col className="w-[150px]" />
              <col className="w-[220px]" />
            </colgroup>
          <thead className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            <tr>
              <th className="px-2 pb-3" scope="col">
                Cliente
              </th>
              <th className="px-2 pb-3" scope="col">
                Cita
              </th>
              <th className="px-2 pb-3" scope="col">
                Empleado
              </th>
              <th className="px-2 pb-3" scope="col">
                Cliente original
              </th>
              <th className="px-2 pb-3" scope="col">
                Estado espera
              </th>
              <th className="px-2 pb-3" scope="col">
                Creada
              </th>
              <th className="px-2 pb-3 text-right" scope="col">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-2 py-4 text-[color:var(--muted)]" colSpan={7}>
                  Cargando lista de espera...
                </td>
              </tr>
            ) : hasWaitlist ? (
              paginatedWaitlist.map((entry) => {
                const appointment = entry?.citas;
                const waitClient = entry?.clientes;
                const appointmentTitle = formatAppointmentTitle(appointment);
                const appointmentTime = formatDateTime(appointment?.tiempo_inicio);
                const employeeName = appointment?.empleados?.nombre || "Sin empleado";
                const rawStatus = normalizeStatus(appointment?.estado) || "pendiente";
                const originalLabel = STATE_LABELS[rawStatus] || "Estado desconocido";
                const waitStatus = normalizeStatus(entry?.estado) || "pendiente";
                const waitStatusLabel =
                  WAITLIST_STATUS_LABELS[waitStatus] || waitStatus;
                const canAssign = AVAILABLE_STATES.has(rawStatus);

                return (
                  <tr
                    key={entry.uuid}
                    className="border-t border-[color:var(--border)] align-top transition hover:bg-[color:var(--surface-muted)]"
                  >
                    <td className="px-2 py-4">
                      <div className="min-w-0">
                        <div
                          className="truncate font-semibold text-[color:var(--foreground)]"
                          title={waitClient?.nombre || ""}
                        >
                          {waitClient?.nombre || "Sin cliente"}
                        </div>
                        <div className="text-xs text-[color:var(--muted)]">
                          {waitClient?.telefono || "Sin telefono"}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      <div className="min-w-0">
                        <div
                          className="truncate font-semibold text-[color:var(--foreground)]"
                          title={appointmentTitle}
                        >
                          {appointmentTitle}
                        </div>
                        <div className="text-xs text-[color:var(--muted)]">
                          {appointmentTime}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-[color:var(--muted-strong)]">
                      {employeeName}
                    </td>
                    <td className="px-2 py-4 text-[color:var(--muted-strong)]">
                      <div className="min-w-0">
                        <div className="font-semibold text-[color:var(--foreground)]">
                          {originalLabel}
                        </div>
                        <div className="text-xs text-[color:var(--muted)]">
                          Estado cita: {rawStatus}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-[color:var(--muted-strong)]">
                      <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)]">
                        {waitStatusLabel}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-[color:var(--muted-strong)] whitespace-nowrap">
                      {formatDateTime(entry?.created_at)}
                    </td>
                    <td className="px-2 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          className={`${getAssignButtonClass(
                            canAssign
                          )} disabled:cursor-not-allowed disabled:opacity-80`}
                          disabled={!canAssign || assigningId === entry.uuid}
                          onClick={() => handleAssign(entry)}
                          title={
                            canAssign
                              ? "Disponible para pasar a cita"
                              : "La cita original aun no esta libre"
                          }
                          type="button"
                        >
                          {assigningId === entry.uuid ? "Asignando..." : "Pasar a cita"}
                        </button>
                        <button
                          className="rounded-full border border-[color:var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
                          onClick={() => openEdit(entry)}
                          type="button"
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-full border border-rose-400/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-400/70"
                          onClick={() => handleDelete(entry)}
                          type="button"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-2 py-4 text-[color:var(--muted)]" colSpan={7}>
                  No hay clientes en lista de espera.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showWaitlistPagination && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
          <span>
            Mostrando {waitlistRangeStart}-{waitlistRangeEnd} de{" "}
            {orderedWaitlist.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={waitlistPage === 1}
              onClick={() => setWaitlistPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              Anterior
            </button>
            <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)]">
              {waitlistPage} / {waitlistTotalPages}
            </span>
            <button
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={waitlistPage === waitlistTotalPages}
              onClick={() =>
                setWaitlistPage((prev) => Math.min(waitlistTotalPages, prev + 1))
              }
              type="button"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <ModalShell isOpen={modalOpen} onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {editingEntry ? "Editar espera" : "Nueva espera"}
              </p>
              <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
                {editingEntry
                  ? "Actualiza la cita o el cliente."
                  : "Selecciona la cita y el cliente que espera."}
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
              Cita
              <select
                className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.3)]"
                onChange={handleChange("appointmentId")}
                required
                value={formState.appointmentId}
              >
                <option value="">Selecciona una cita</option>
                {appointmentOptions.map((appointment) => (
                  <option key={appointment.uuid} value={appointment.uuid}>
                    {formatAppointmentLabel(appointment)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {optionsLoading && (
            <p className="mt-3 text-xs text-[color:var(--muted)]">
              Cargando citas...
            </p>
          )}
          {optionsError && (
            <p className="mt-3 text-xs text-rose-200">{optionsError}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-[linear-gradient(135deg,var(--supabase-green),var(--supabase-green-dark))] px-5 py-3 text-sm font-semibold text-[#04140b] shadow-[0_18px_40px_-24px_rgba(31,157,107,0.6)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {editingEntry ? "Guardar cambios" : "Anadir a espera"}
            </button>
            <button
              className="rounded-2xl border border-[color:var(--border)] px-5 py-3 text-sm font-semibold text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={closeModal}
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

      <ModalShell isOpen={linkModalOpen} onClose={closeLinkModal} size="max-w-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Enlace de confirmacion
            </p>
            <p className="mt-1 text-sm text-[color:var(--muted-strong)]">
              Envia este enlace al cliente nuevo.
            </p>
          </div>
          <button
            className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
            onClick={closeLinkModal}
            type="button"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm text-[color:var(--muted-strong)]">
          <p className="break-all text-[color:var(--foreground)]">
            {generatedLink}
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
      </ModalShell>
    </section>
  );
}
