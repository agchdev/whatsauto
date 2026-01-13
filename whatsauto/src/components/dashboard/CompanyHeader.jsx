export default function CompanyHeader({ companyName, dataLoading }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-1">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Empresa
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
          {companyName}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Panel de administracion con acceso por equipo.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {dataLoading ? (
          <span className="rounded-full border border-[color:rgb(var(--supabase-green-rgb)/0.5)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--supabase-green)]">
            Actualizando datos...
          </span>
        ) : (
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--muted-strong)]">
            Datos sincronizados
          </span>
        )}
      </div>
    </header>
  );
}
