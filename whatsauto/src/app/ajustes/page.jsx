"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AuthLoading from "../../components/auth/AuthLoading";
import CompanyPasswordView from "../../components/auth/CompanyPasswordView";
import LoginView from "../../components/auth/LoginView";
import { DEFAULT_PALETTE_KEY, PALETTES } from "../../constants";
import {
  applyPalette,
  loadStoredPalette,
  persistPalette,
  THEME_STORAGE_KEY,
} from "../../lib/theme";
import { getSupabaseClient } from "../../lib/supabaseClient";

const initialStatus = { type: "idle", message: "" };
const COMPANY_PASSWORD_KEY = "welyd.company-password";

export default function AjustesPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [companyPassword, setCompanyPassword] = useState("");
  const [companyPasswordStatus, setCompanyPasswordStatus] =
    useState(initialStatus);
  const [companyVerified, setCompanyVerified] = useState(false);
  const [paletteKey, setPaletteKey] = useState(() => loadStoredPalette());

  const resolveClient = useCallback(() => {
    try {
      return { client: getSupabaseClient(), error: null };
    } catch (error) {
      return { client: null, error };
    }
  }, []);

  useEffect(() => {
    const appliedKey = applyPalette(paletteKey);
    persistPalette(appliedKey);
    if (appliedKey !== paletteKey) {
      setPaletteKey(appliedKey);
    }
  }, [paletteKey]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      setPaletteKey(event.newValue || DEFAULT_PALETTE_KEY);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    let mounted = true;
    const { client, error } = resolveClient();

    if (error) {
      if (mounted) {
        setStatus({
          type: "error",
          message:
            "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        });
        setAuthReady(true);
      }
      return () => {
        mounted = false;
      };
    }

    client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        setStatus(initialStatus);
        setAuthReady(true);
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [resolveClient]);

  useEffect(() => {
    if (!session) {
      setCompanyPassword("");
      setCompanyPasswordStatus(initialStatus);
      setCompanyVerified(false);
      return;
    }

    const storageKey = session?.user?.id
      ? `${COMPANY_PASSWORD_KEY}:${session.user.id}`
      : COMPANY_PASSWORD_KEY;
    const stored =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(storageKey)
        : null;

    setCompanyPassword("");
    setCompanyPasswordStatus(initialStatus);
    setCompanyVerified(stored === "true");
  }, [session]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setStatus({
        type: "error",
        message: "Escribe tu correo para enviarte el enlace.",
      });
      return;
    }

    setStatus({ type: "loading", message: "" });

    const { client, error: clientError } = resolveClient();
    if (clientError || !client) {
      setStatus({
        type: "error",
        message:
          "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      });
      return;
    }

    const { error } = await client.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setStatus({
        type: "error",
        message: "No pudimos enviar el enlace. Intenta otra vez.",
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Listo. Revisa tu correo para iniciar sesion.",
    });
  };

  const handleSignOut = async () => {
    const storageKey = session?.user?.id
      ? `${COMPANY_PASSWORD_KEY}:${session.user.id}`
      : COMPANY_PASSWORD_KEY;
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(storageKey);
    }
    const { client } = resolveClient();
    if (!client) return;
    await client.auth.signOut();
  };

  const handleCompanyPasswordSubmit = async (event) => {
    event.preventDefault();
    const trimmedPassword = companyPassword.trim();

    if (!trimmedPassword) {
      setCompanyPasswordStatus({
        type: "error",
        message: "Escribe la contrasena de la empresa.",
      });
      return;
    }

    if (!session?.access_token) {
      setCompanyPasswordStatus({
        type: "error",
        message: "Sesion invalida. Inicia sesion otra vez.",
      });
      return;
    }

    setCompanyPasswordStatus({ type: "loading", message: "" });

    const response = await fetch("/api/company/password", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: trimmedPassword }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.status !== "ok") {
      setCompanyPasswordStatus({
        type: "error",
        message: payload.message || "No pudimos validar la contrasena.",
      });
      return;
    }

    const storageKey = session?.user?.id
      ? `${COMPANY_PASSWORD_KEY}:${session.user.id}`
      : COMPANY_PASSWORD_KEY;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "true");
    }

    setCompanyVerified(true);
    setCompanyPassword("");
    setCompanyPasswordStatus(initialStatus);
  };

  const isLoading = status.type === "loading";
  const hasSession = Boolean(session);
  const hasCompanyAccess = hasSession && companyVerified;
  const activePalette =
    PALETTES.find((palette) => palette.key === paletteKey) || PALETTES[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_var(--theme-glow),_var(--background)_55%,_var(--theme-base)_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-8 h-[320px] w-[320px] rounded-full bg-[rgb(var(--supabase-green-rgb)/0.18)] blur-[140px] motion-safe:animate-[floaty_12s_ease-in-out_infinite]" />
        <div className="absolute -bottom-36 left-[-140px] h-[420px] w-[420px] rounded-full bg-[rgb(var(--theme-base-rgb)/0.7)] blur-[140px]" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgb(var(--theme-dot-rgb)/0.08)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-12 sm:py-16">
        {!authReady ? (
          <AuthLoading />
        ) : hasCompanyAccess ? (
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Preferencias
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
                  Ajustes del panel
                </h1>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Gestiona el tema visual y los detalles del panel.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
                  href="/"
                >
                  Volver al panel
                </Link>
                <button
                  className="rounded-full border border-[color:rgb(var(--supabase-green-rgb)/0.5)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--supabase-green)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green-bright)]"
                  onClick={handleSignOut}
                  type="button"
                >
                  Salir
                </button>
              </div>
            </div>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.2)]">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Tema
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                  Paletas disponibles
                </h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Elige el estilo que mejor encaje con tu marca.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {PALETTES.map((palette) => {
                    const isActive = palette.key === paletteKey;
                    return (
                      <button
                        key={palette.key}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          isActive
                            ? "border-[color:var(--supabase-green)] bg-[color:var(--surface-strong)] text-[color:var(--supabase-green)]"
                            : "border-[color:var(--border)] text-[color:var(--muted-strong)] hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
                        }`}
                        onClick={() => setPaletteKey(palette.key)}
                        type="button"
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: palette.accent }}
                          />
                          {palette.label}
                        </span>
                        {isActive && (
                          <span className="text-[10px] uppercase tracking-[0.2em]">
                            Activo
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.2)]">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Vista previa
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                  {activePalette.label}
                </h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  El tema se guarda automaticamente en este navegador.
                </p>
                <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: activePalette.accent }}
                    />
                    <p className="text-sm font-semibold text-[color:var(--foreground)]">
                      Acento {activePalette.accent}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-[color:var(--muted)]">
                    <span>Fondo: {activePalette.background}</span>
                    <span>Superficie: {activePalette.surface}</span>
                    <span>Texto: {activePalette.foreground}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : hasSession ? (
          <CompanyPasswordView
            isLoading={companyPasswordStatus.type === "loading"}
            onPasswordChange={(event) => setCompanyPassword(event.target.value)}
            onSignOut={handleSignOut}
            onSubmit={handleCompanyPasswordSubmit}
            password={companyPassword}
            status={companyPasswordStatus}
          />
        ) : (
          <LoginView
            email={email}
            isLoading={isLoading}
            onEmailChange={(event) => setEmail(event.target.value)}
            onSubmit={handleSubmit}
            status={status}
          />
        )}
      </main>
    </div>
  );
}
