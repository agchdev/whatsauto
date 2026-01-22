export default function LoginPanel({ email, status, isLoading, onEmailChange, onSubmit }) {
  const showStatus = status?.type && status.type !== "idle";

  return (
    <section className="relative motion-safe:animate-[reveal_0.9s_ease-out_both] motion-safe:[animation-delay:180ms]">
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-[0_32px_90px_-60px_rgba(0,0,0,0.9)] backdrop-blur">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Acceso
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
              Inicia sesion con tu correo
            </h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Te enviaremos un enlace seguro. Al entrar validaras la contrasena de la empresa.
            </p>
          </div>
          <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--muted-strong)]">
            Supabase Auth
          </span>
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-[color:var(--foreground)]">
            Correo electronico
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-base text-[color:var(--foreground)] shadow-sm outline-none transition focus:border-[color:var(--supabase-green)] focus:ring-2 focus:ring-[color:rgb(var(--supabase-green-rgb)/0.35)]"
              onChange={onEmailChange}
              placeholder="tu@email.com"
              type="email"
              value={email}
            />
          </label>

          {showStatus && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                status.type === "error"
                  ? "border-rose-300/30 bg-rose-500/10 text-rose-200"
                  : "border-emerald-300/30 bg-emerald-500/10 text-emerald-200"
              }`}
              role="status"
            >
              {status.type === "loading"
                ? "Enviando enlace seguro..."
                : status.message}
            </div>
          )}

          <button
            className="w-full rounded-2xl bg-[linear-gradient(135deg,#3ecf8e,#1f9d6b)] px-4 py-3 text-base font-semibold text-[#04140b] shadow-[0_18px_40px_-24px_rgba(31,157,107,0.8)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-28px_rgba(31,157,107,0.9)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!email.trim() || isLoading}
            type="submit"
          >
            {isLoading ? "Enviando..." : "Enviar enlace magico"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-xs text-[color:var(--muted)]">
          Usamos Supabase para mantener el acceso aislado por empresa y reforzar
          la seguridad de tu agenda.
        </div>
      </div>
    </section>
  );
}
