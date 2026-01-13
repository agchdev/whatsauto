import { formatPrice } from "../../lib/formatters";

export default function StatsSummary({
  totalIncome,
  completedCount,
  pendingCount,
  confirmedCount,
  isLoading,
}) {
  const incomeLabel = isLoading ? "--" : formatPrice(totalIncome);
  const completedLabel = isLoading ? "--" : completedCount;
  const pendingLabel = isLoading ? "--" : pendingCount;
  const confirmedLabel = isLoading ? "--" : confirmedCount;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Ingresos totales
        </p>
        <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)] sm:text-4xl">
          {incomeLabel}
        </p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Total generado por citas realizadas.
        </p>
      </article>

      <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Citas realizadas
        </p>
        <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)] sm:text-4xl">
          {completedLabel}
        </p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Historial total de citas completadas.
        </p>
      </article>

      <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Citas confirmadas
        </p>
        <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)] sm:text-4xl">
          {confirmedLabel}
        </p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Citas confirmadas por clientes.
        </p>
      </article>

      <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Citas pendientes
        </p>
        <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)] sm:text-4xl">
          {pendingLabel}
        </p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Citas en espera de confirmacion.
        </p>
      </article>
    </div>
  );
}
