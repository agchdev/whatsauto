export default function EmployeeCard({ name, role, email, phone }) {
  return (
    <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Empleado
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            Datos del empleado
          </h2>
        </div>
        <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--muted-strong)]">
          {role}
        </span>
      </div>
      <div className="mt-6 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[color:var(--muted)]">Nombre</span>
          <span className="text-[color:var(--foreground)]">{name}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[color:var(--muted)]">Correo</span>
          <span className="text-[color:var(--foreground)]">{email}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[color:var(--muted)]">Telefono</span>
          <span className="text-[color:var(--foreground)]">{phone}</span>
        </div>
      </div>
    </article>
  );
}
