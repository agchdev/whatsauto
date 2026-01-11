const navItems = [
  { label: "Panel", key: "panel" },
  { label: "Empleados", key: "empleados" },
  { label: "Servicios", key: "servicios" },
  { label: "Citas", key: "citas" },
  { label: "Clientes", key: "clientes" },
];

export default function Sidebar({ activeKey = "panel", employeeName, employeeRole, employeeEmail, onSignOut }) {
  return (
    <aside className="flex w-full flex-col rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)] lg:sticky lg:top-6 lg:min-h-[calc(100vh-6rem)] lg:w-64">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            WhatsAuto
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
            Panel
          </p>
        </div>
        <span className="rounded-full border border-[color:rgb(var(--supabase-green-rgb)/0.5)] bg-[color:var(--surface-strong)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[color:var(--supabase-green)]">
          RLS
        </span>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-[color:var(--surface-strong)] text-[color:var(--foreground)] shadow-[0_18px_40px_-30px_rgba(0,0,0,0.8)]"
                  : "text-[color:var(--muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--muted-strong)]"
              }`}
              type="button"
            >
              <span>{item.label}</span>
              {isActive && (
                <span className="h-2 w-2 rounded-full bg-[color:var(--supabase-green)] shadow-[0_0_12px_rgba(62,207,142,0.9)]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[color:var(--border)] pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--foreground)]">
              {employeeName}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              {employeeRole}
            </p>
          </div>
          <button
            className="rounded-full border border-[color:rgb(var(--supabase-green-rgb)/0.6)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--supabase-green)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green-bright)]"
            onClick={onSignOut}
            type="button"
          >
            Salir
          </button>
        </div>
        <p className="mt-3 text-xs text-[color:var(--muted)]">{employeeEmail}</p>
      </div>
    </aside>
  );
}
