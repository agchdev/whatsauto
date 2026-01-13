"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatDateTime, formatPrice } from "../../lib/formatters";

const initialStatus = {
  state: "loading",
  message: "Cargando confirmacion...",
  appointment: null,
};

export default function ConfirmAppointmentPage() {
  const params = useParams();
  const tokenParam = params?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const [status, setStatus] = useState(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setStatus(initialStatus);
      const response = await fetch(
        `/api/confirm?token=${encodeURIComponent(token)}`
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
        message: "Confirma o rechaza la cita.",
        appointment: payload.appointment,
      });
    };

    load();
  }, [token]);

  const handleAction = async (action) => {
    if (!token) return;
    setIsSubmitting(true);

    const response = await fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action }),
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
            Confirmacion
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
            Cita pendiente de respuesta
          </h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            {status.message}
          </p>

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
              className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={
                status.state !== "ready" || isSubmitting || status.state === "used"
              }
              onClick={() => handleAction("confirm")}
              type="button"
            >
              Confirmar cita
            </button>
            <button
              className="w-full rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:border-rose-400/70 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={
                status.state !== "ready" || isSubmitting || status.state === "used"
              }
              onClick={() => handleAction("reject")}
              type="button"
            >
              Rechazar cita
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
