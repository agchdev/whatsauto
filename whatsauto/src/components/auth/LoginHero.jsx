import ThemeLogo from "../branding/ThemeLogo";

export default function LoginHero() {
  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <ThemeLogo
          className="h-12 w-12 motion-safe:animate-[reveal_0.7s_ease-out_both]"
          label="WeLyd"
        />
      </div>

      <div className="space-y-4 motion-safe:animate-[reveal_0.9s_ease-out_both] motion-safe:[animation-delay:120ms]">
        <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-5xl">
          WeLyd
          <span className="block text-[color:var(--supabase-green)]">
            agenda inteligente
          </span>
        </h1>
        <p className="max-w-xl text-lg text-[color:var(--muted)]">
          Acceso rápido para equipos que gestionan citas, clientes y
          disponibilidad en tiempo real. Todo con seguridad multi-tenant y
          autenticacion por correo.
        </p>
      </div>


    </section>
  );
}
