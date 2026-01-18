"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatDateTime, formatPrice } from "../../lib/formatters";

const VALID_TIPOS = ["confirmar", "eliminar", "espera", "modificar"];

const TYPE_CONFIG = {
  confirmar: {
    eyebrow: "Confirmacion",
    title: "Cita pendiente de respuesta",
    prompt: "Confirma o rechaza la cita.",
    confirmLabel: "Confirmar cita",
    rejectLabel: "Rechazar cita",
    confirmVariant: "primary",
    rejectVariant: "danger",
  },
  eliminar: {
    eyebrow: "Eliminacion",
    title: "Confirmar eliminacion de la cita",
    prompt: "Confirma si deseas eliminar la cita.",
    confirmLabel: "Eliminar cita",
    rejectLabel: "Mantener cita",
    confirmVariant: "danger",
    rejectVariant: "primary",
  },
  espera: {
    eyebrow: "Lista de espera",
    title: "Confirmar lista de espera",
    prompt: "Confirma si deseas entrar en la lista de espera.",
    confirmLabel: "Entrar en lista de espera",
    rejectLabel: "No por ahora",
    confirmVariant: "primary",
    rejectVariant: "danger",
  },
  modificar: {
    eyebrow: "Modificacion",
    title: "Confirmar modificacion de la cita",
    prompt: "Confirma si aceptas la modificacion.",
    confirmLabel: "Aceptar cambios",
    rejectLabel: "Rechazar cambios",
    confirmVariant: "primary",
    rejectVariant: "danger",
  },
};

const initialStatus = {
  state: "loading",
  message: "Cargando confirmacion...",
  appointment: null,
};

const BUTTON_BASE =
  "w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70";
const BUTTON_VARIANTS = {
  primary: `${BUTTON_BASE} border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--foreground)] hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]`,
  danger: `${BUTTON_BASE} border-rose-400/40 bg-rose-500/10 text-rose-200 hover:border-rose-400/70`,
};

const normalizeParam = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const normalizeToken = (value) =>
  typeof value === "string" ? value.trim() : "";

export default function ConfirmationPage({
  defaultTipo = "confirmar",
  token: tokenProp,
  tipo: tipoProp,
}) {
  const params = useParams();
  const tokenParam = tokenProp ?? params?.token;
  const tipoParam = tipoProp ?? params?.tipo;
  const rawToken = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const fallbackTipo = normalizeParam(defaultTipo) || "confirmar";
  const tipoRaw = Array.isArray(tipoParam) ? tipoParam[0] : tipoParam;
  const tipo = normalizeParam(tipoRaw) || fallbackTipo;
  const token = normalizeToken(rawToken);
  const isTipoValid = VALID_TIPOS.includes(tipo);
  const config = TYPE_CONFIG[tipo] || TYPE_CONFIG.confirmar;
  const [status, setStatus] = useState(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus({
        state: "invalid",
        message: "Token no valido.",
        appointment: null,
      });
      return;
    }

    if (!isTipoValid) {
      setStatus({
        state: "invalid",
        message: "Tipo de confirmacion no valido.",
        appointment: null,
      });
      return;
    }

    const load = async () => {
      setStatus(initialStatus);
      const response = await fetch(
        `/api/confirm?token=${encodeURIComponent(token)}&tipo=${encodeURIComponent(
          tipo
        )}`
      );
      const payload = await response.json().catch(() => ({}));

      if (payload.status !== "ok") {
        setStatus({
          state: payload.status || "error",
          message:
            payload.message || "No pudimos validar la confirmacion de la cita.",
          appointment: null,
        });
        return;
      }

      setStatus({
        state: "ready",
        message: config.prompt,
        appointment: payload.appointment,
      });
    };

    load();
  }, [config.prompt, isTipoValid, tipo, token]);

  const handleAction = async (action) => {
    if (!token || !isTipoValid) return;
    setIsSubmitting(true);

    const response = await fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, tipo, action }),
    });

    const payload = await response.json().catch(() => ({}));

    setStatus({
      state: payload.status || "error",
      message:
        payload.message || "No pudimos actualizar la confirmacion de la cita.",
      appointment: status.appointment,
    });

    setIsSubmitting(false);
  };

  const appointment = status.appointment;
  const confirmClass =
    BUTTON_VARIANTS[config.confirmVariant] || BUTTON_VARIANTS.primary;
  const rejectClass =
    BUTTON_VARIANTS[config.rejectVariant] || BUTTON_VARIANTS.danger;
  const isAppointmentConfirmed =
    status.state === "confirmed" && tipo === "confirmar";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_var(--theme-glow),_var(--background)_55%,_var(--theme-base)_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-8 h-[320px] w-[320px] rounded-full bg-[rgb(var(--supabase-green-rgb)/0.18)] blur-[140px] motion-safe:animate-[floaty_12s_ease-in-out_infinite]" />
        <div className="absolute -bottom-36 left-[-140px] h-[420px] w-[420px] rounded-full bg-[rgb(var(--theme-base-rgb)/0.7)] blur-[140px]" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgb(var(--theme-dot-rgb)/0.08)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
        <section className="w-full rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-[0_32px_90px_-60px_rgba(0,0,0,0.9)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {config.eyebrow}
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
            {config.title}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            {status.message}
          </p>

          {isAppointmentConfirmed && (
            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[color:rgb(var(--supabase-green-rgb)/0.35)] bg-[color:rgb(var(--supabase-green-rgb)/0.08)] px-4 py-3 text-sm text-[color:var(--muted-strong)] motion-safe:animate-[confirm-pop_0.5s_ease-out_both]">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[color:rgb(var(--supabase-green-rgb)/0.5)] bg-[color:rgb(var(--supabase-green-rgb)/0.12)]">
                <span className="absolute inset-0 rounded-full border border-[color:rgb(var(--supabase-green-rgb)/0.6)] motion-safe:animate-[confirm-ring_0.9s_ease-out_both]" />
                <svg
                  className="h-5 w-5 text-[color:var(--supabase-green-bright)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path
                    className="motion-safe:animate-[confirm-draw_0.6s_ease-out_both]"
                    d="M5 13l4 4L19 7"
                    strokeDasharray="24"
                    strokeDashoffset="24"
                  />
                </svg>
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Confirmacion lista
                </p>
                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                  Cita confirmada
                </p>
              </div>
            </div>
          )}

          {appointment && (
            <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-5 text-sm text-[color:var(--muted-strong)]">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-6">
                  <div className="min-w-[180px]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Cliente
                    </p>
                    <p className="text-base font-semibold text-[color:var(--foreground)]">
                      {appointment.clientes?.nombre || "Sin cliente"}
                    </p>
                    {appointment.clientes?.telefono && (
                      <p className="text-xs text-[color:var(--muted)]">
                        {appointment.clientes.telefono}
                      </p>
                    )}
                  </div>
                  <div className="min-w-[180px]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Servicio
                    </p>
                    <p className="text-base font-semibold text-[color:var(--foreground)]">
                      {appointment.servicios?.nombre || "Sin servicio"}
                    </p>
                    {appointment.servicios?.precio !== undefined && (
                      <p className="text-xs text-[color:var(--muted)]">
                        {formatPrice(appointment.servicios.precio)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Inicio
                    </p>
                    <p className="text-base font-semibold text-[color:var(--foreground)]">
                      {formatDateTime(appointment.tiempo_inicio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Fin
                    </p>
                    <p className="text-base font-semibold text-[color:var(--foreground)]">
                      {formatDateTime(appointment.tiempo_fin)}
                    </p>
                  </div>
                </div>
                {appointment.titulo && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Titulo
                    </p>
                    <p className="text-base font-semibold text-[color:var(--foreground)]">
                      {appointment.titulo}
                    </p>
                  </div>
                )}
                {appointment.descripcion && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Descripcion
                    </p>
                    <p className="text-sm text-[color:var(--muted-strong)]">
                      {appointment.descripcion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              className={confirmClass}
              disabled={status.state !== "ready" || isSubmitting}
              onClick={() => handleAction("confirm")}
              type="button"
            >
              {config.confirmLabel}
            </button>
            <button
              className={rejectClass}
              disabled={status.state !== "ready" || isSubmitting}
              onClick={() => handleAction("reject")}
              type="button"
            >
              {config.rejectLabel}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
