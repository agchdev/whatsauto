"use client";

import { useMemo } from "react";

const pad2 = (value) => String(value).padStart(2, "0");

const buildPeriodRanges = (now) => {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  return {
    day: { start: dayStart, end: dayEnd },
    month: { start: monthStart, end: monthEnd },
    year: { start: yearStart, end: yearEnd },
  };
};

const buildPeriodLabels = (now) => ({
  day: `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}`,
  month: `${pad2(now.getMonth() + 1)}/${now.getFullYear()}`,
  year: `${now.getFullYear()}`,
});

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildTop = (rows, key) => {
  if (!rows.length) return { name: "Sin datos", count: 0 };
  let top = rows[0];
  for (const row of rows) {
    if (row[key] > top[key]) {
      top = row;
    }
  }
  if (!top[key]) return { name: "Sin datos", count: 0 };
  return { name: top.name, count: top[key] };
};

const buildCategoryStats = ({
  appointments,
  ranges,
  pickItem,
  fallbackName,
  fallbackId,
}) => {
  const map = new Map();

  for (const appointment of appointments) {
    const date = parseDate(appointment?.tiempo_inicio);
    if (!date) continue;
    if (date < ranges.year.start || date >= ranges.year.end) continue;

    const item = pickItem(appointment);
    const name = item?.nombre || item?.name || fallbackName;
    const id = item?.uuid || item?.id || item?.codigo || name || fallbackId;
    const entry = map.get(id) || { id, name, day: 0, month: 0, year: 0 };

    if (date >= ranges.day.start && date < ranges.day.end) {
      entry.day += 1;
    }
    if (date >= ranges.month.start && date < ranges.month.end) {
      entry.month += 1;
    }
    entry.year += 1;

    map.set(id, entry);
  }

  const rows = Array.from(map.values());
  rows.sort(
    (a, b) =>
      b.year - a.year ||
      b.month - a.month ||
      b.day - a.day ||
      a.name.localeCompare(b.name)
  );

  return {
    rows,
    topDay: buildTop(rows, "day"),
    topMonth: buildTop(rows, "month"),
    topYear: buildTop(rows, "year"),
  };
};

const HighlightCard = ({ label, rangeLabel, name, count, isLoading }) => {
  const displayName = isLoading ? "--" : name;
  const displayCount = isLoading ? "--" : `${count} citas`;

  return (
    <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5 shadow-[0_20px_60px_-50px_rgba(0,0,0,0.9)]">
      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-xs text-[color:var(--muted)]">{rangeLabel}</p>
      <p className="mt-4 text-lg font-semibold text-[color:var(--foreground)]">
        {displayName}
      </p>
      <p className="mt-2 text-sm text-[color:var(--muted-strong)]">
        {displayCount}
      </p>
    </article>
  );
};

const StatsSection = ({
  label,
  title,
  rows,
  topDay,
  topMonth,
  topYear,
  periodLabels,
  isLoading,
  emptyMessage,
}) => {
  const rowsCount = isLoading ? "--" : rows.length;

  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {label}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            {title}
          </h2>
        </div>
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--muted-strong)]">
          {rowsCount}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <HighlightCard
          label="Hoy"
          rangeLabel={periodLabels.day}
          name={topDay.name}
          count={topDay.count}
          isLoading={isLoading}
        />
        <HighlightCard
          label="Mes"
          rangeLabel={periodLabels.month}
          name={topMonth.name}
          count={topMonth.count}
          isLoading={isLoading}
        />
        <HighlightCard
          label="Ano"
          rangeLabel={periodLabels.year}
          name={topYear.name}
          count={topYear.count}
          isLoading={isLoading}
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            <tr>
              <th className="pb-3" scope="col">
                {label}
              </th>
              <th className="pb-3" scope="col">
                Hoy
              </th>
              <th className="pb-3" scope="col">
                Mes
              </th>
              <th className="pb-3" scope="col">
                Ano
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="py-4 text-[color:var(--muted)]" colSpan={4}>
                  Cargando estadisticas...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-[color:var(--border)]">
                  <td className="py-4 font-semibold text-[color:var(--foreground)]">
                    {row.name}
                  </td>
                  <td className="py-4 text-[color:var(--muted-strong)]">
                    {row.day}
                  </td>
                  <td className="py-4 text-[color:var(--muted-strong)]">
                    {row.month}
                  </td>
                  <td className="py-4 text-[color:var(--muted-strong)]">
                    {row.year}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-4 text-[color:var(--muted)]" colSpan={4}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default function StatisticsPanel({ appointments = [], isLoading }) {
  const stats = useMemo(() => {
    const now = new Date();
    const ranges = buildPeriodRanges(now);
    const periodLabels = buildPeriodLabels(now);

    return {
      periodLabels,
      services: buildCategoryStats({
        appointments,
        ranges,
        pickItem: (appointment) => appointment?.servicios,
        fallbackName: "Sin servicio",
        fallbackId: "service-unknown",
      }),
      employees: buildCategoryStats({
        appointments,
        ranges,
        pickItem: (appointment) => appointment?.empleados,
        fallbackName: "Sin empleado",
        fallbackId: "employee-unknown",
      }),
      clients: buildCategoryStats({
        appointments,
        ranges,
        pickItem: (appointment) => appointment?.clientes,
        fallbackName: "Sin cliente",
        fallbackId: "client-unknown",
      }),
    };
  }, [appointments]);

  return (
    <div className="flex flex-col gap-6">
      <StatsSection
        label="Servicios"
        title="Servicios mas solicitados"
        rows={stats.services.rows}
        topDay={stats.services.topDay}
        topMonth={stats.services.topMonth}
        topYear={stats.services.topYear}
        periodLabels={stats.periodLabels}
        isLoading={isLoading}
        emptyMessage="No hay servicios solicitados en este periodo."
      />
      <StatsSection
        label="Empleados"
        title="Empleados con mas citas"
        rows={stats.employees.rows}
        topDay={stats.employees.topDay}
        topMonth={stats.employees.topMonth}
        topYear={stats.employees.topYear}
        periodLabels={stats.periodLabels}
        isLoading={isLoading}
        emptyMessage="No hay citas asignadas a empleados en este periodo."
      />
      <StatsSection
        label="Clientes"
        title="Clientes con mas citas"
        rows={stats.clients.rows}
        topDay={stats.clients.topDay}
        topMonth={stats.clients.topMonth}
        topYear={stats.clients.topYear}
        periodLabels={stats.periodLabels}
        isLoading={isLoading}
        emptyMessage="No hay clientes con citas en este periodo."
      />
    </div>
  );
}
