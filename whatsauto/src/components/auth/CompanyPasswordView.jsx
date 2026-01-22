import LoginHero from "./LoginHero";

const STATUS_STYLES = {
  error: "border-rose-300/30 bg-rose-500/10 text-rose-200",
  success: "border-emerald-300/30 bg-emerald-500/10 text-emerald-200",
  loading: "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted)]",
};

const CompanyPasswordPanel = ({
  password,
  status,
  isLoading,
  onPasswordChange,
  onSubmit,
  onSignOut,
}) => {
  const showStatus = status?.type && status.type !== "idle";
  const statusClass = STATUS_STYLES[status?.type] || STATUS_STYLES.loading;

  return (
    <section className="relative motion-safe:animate-[reveal_0.9s_ease-out_both] motion-safe:[animation-delay:180ms]">
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-[0_32px_90px_-60px_rgba(0,0,0,0.9)] backdrop-blur">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Acceso protegido
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
              Contrasena de empresa
            </h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Verifica la contrasena de la empresa para continuar.
            </p>
          </div>
          <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--muted-strong)]">
            Seguridad extra
          </span>
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-[color:var(--foreground)]">
            Contrasena
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-base text-[color:var(--foreground)] shadow-sm outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.35)]"
              onChange={onPasswordChange}
              placeholder="Introduce la contrasena de la empresa"
              type="password"
              value={password}
            />
          </label>

          {showStatus && (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${statusClass}`}>
              {status.type === "loading" ? "Verificando..." : status.message}
            </div>
          )}

          <button
            className="w-full rounded-2xl bg-[linear-gradient(135deg,#3ecf8e,#1f9d6b)] px-4 py-3 text-base font-semibold text-[#04140b] shadow-[0_18px_40px_-24px_rgba(31,157,107,0.8)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-28px_rgba(31,157,107,0.9)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!password.trim() || isLoading}
            type="submit"
          >
            {isLoading ? "Verificando..." : "Continuar"}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
          <span>Tu sesion esta activa, falta validar la empresa.</span>
          {onSignOut && (
            <button
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={onSignOut}
              type="button"
            >
              Salir
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default function CompanyPasswordView(props) {
  return (
    <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <LoginHero />
      <CompanyPasswordPanel {...props} />
    </div>
  );
}
