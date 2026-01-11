export default function LoginHero() {
  return (
    <section className="space-y-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-[color:rgb(var(--supabase-green-rgb)/0.35)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] shadow-sm backdrop-blur motion-safe:animate-[reveal_0.7s_ease-out_both]">
        <span className="h-2 w-2 rounded-full bg-[color:var(--supabase-green)] shadow-[0_0_16px_rgba(62,207,142,0.8)]" />
        Supabase ready
      </div>

      <div className="space-y-4 motion-safe:animate-[reveal_0.9s_ease-out_both] motion-safe:[animation-delay:120ms]">
        <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-5xl">
          WhatsAuto
          <span className="block text-[color:var(--supabase-green)]">
            agenda inteligente
          </span>
        </h1>
        <p className="max-w-xl text-lg text-[color:var(--muted)]">
          Acceso rapido para equipos que gestionan citas, clientes y
          disponibilidad en tiempo real. Todo con seguridad multi-tenant y
          autenticacion por correo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 motion-safe:animate-[reveal_0.9s_ease-out_both] motion-safe:[animation-delay:220ms]">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[0_20px_60px_-48px_rgba(0,0,0,0.8)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Operativa
          </p>
          <p className="mt-3 text-sm text-[color:var(--muted-strong)]">
            Citas, clientes y esperas sincronizadas por empresa y equipo.
          </p>
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[0_20px_60px_-48px_rgba(0,0,0,0.8)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Control
          </p>
          <p className="mt-3 text-sm text-[color:var(--muted-strong)]">
            Roles y permisos listos para operar con RLS en Supabase.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-[color:var(--muted)] motion-safe:animate-[reveal_0.9s_ease-out_both] motion-safe:[animation-delay:320ms]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:rgb(var(--supabase-green-rgb)/0.35)] bg-[color:var(--surface-strong)] text-xs font-semibold text-[color:var(--supabase-green)]">
          DB
        </div>
        <div>
          <p className="font-medium text-[color:var(--foreground)]">
            Base de datos Supabase
          </p>
          <p className="text-xs text-[color:var(--muted)]">
            Autenticacion por email y politicas RLS activas.
          </p>
        </div>
      </div>
    </section>
  );
}
