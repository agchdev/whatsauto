import ThemeLogo from "../branding/ThemeLogo";

export default function AuthLoading() {
  return (
    <div className="w-full max-w-xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center shadow-[0_30px_70px_-55px_rgba(0,0,0,0.8)]">
      <ThemeLogo className="mx-auto h-12 w-12" label="WeLyd" />
      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
        Supabase Auth
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
        Cargando acceso seguro
      </h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Estamos verificando tu sesion activa.
      </p>
    </div>
  );
}
