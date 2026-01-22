"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AuthLoading from "../components/auth/AuthLoading";
import CompanyPasswordView from "../components/auth/CompanyPasswordView";
import LoginView from "../components/auth/LoginView";
import DashboardView from "../components/dashboard/DashboardView";
import { fetchDashboardData } from "../lib/dashboardData";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialStatus = { type: "idle", message: "" };
const COMPANY_PASSWORD_KEY = "welyd.company-password";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [companyPassword, setCompanyPassword] = useState("");
  const [companyPasswordStatus, setCompanyPasswordStatus] =
    useState(initialStatus);
  const [companyVerified, setCompanyVerified] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [employee, setEmployee] = useState(null);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    completedCount: 0,
    pendingCount: 0,
    confirmedCount: 0,
  });
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [confirmations, setConfirmations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [statsAppointments, setStatsAppointments] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const mountedRef = useRef(true);
  const resolveClient = useCallback(() => {
    try {
      return { client: getSupabaseClient(), error: null };
    } catch (error) {
      return { client: null, error };
    }
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

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshDashboardData = useCallback(async () => {
    if (!session || !companyVerified || !mountedRef.current) return;
    setDataLoading(true);
    setDataError("");

    const result = await fetchDashboardData({
      accessToken: session.access_token,
    });

    if (!mountedRef.current) return;

    setCompanyName(result.companyName);
    setEmployee(result.employee);
    setSummary(result.summary);
    setServices(result.services);
    setEmployees(result.employees);
    setClients(result.clients);
    setUpcomingAppointments(result.upcomingAppointments);
    setConfirmations(result.confirmations);
    setWaitlist(result.waitlist);
    setStatsAppointments(result.statsAppointments);
    setDataError(result.error);
    setDataLoading(false);
  }, [companyVerified, resolveClient, session]);

  useEffect(() => {
    if (!session || !companyVerified) {
      setCompanyName("");
      setEmployee(null);
      setSummary({
        totalIncome: 0,
        completedCount: 0,
        pendingCount: 0,
        confirmedCount: 0,
      });
      setServices([]);
      setEmployees([]);
      setClients([]);
      setUpcomingAppointments([]);
      setConfirmations([]);
      setWaitlist([]);
      setStatsAppointments([]);
      setDataLoading(false);
      setDataError("");
      return;
    }

    refreshDashboardData();
  }, [companyVerified, session, refreshDashboardData]);

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

  const isLoading = status.type === "loading";
  const hasSession = Boolean(session);
  const hasCompanyAccess = hasSession && companyVerified;
  const userEmail = session?.user?.email ?? "Equipo";
  const mainAlignment =
    !authReady || !hasCompanyAccess ? "items-center" : "items-stretch";
  const mainClassName = hasCompanyAccess
    ? "relative flex min-h-screen w-full px-0 py-0"
    : `relative mx-auto flex min-h-screen max-w-6xl px-6 py-12 sm:py-16 ${mainAlignment}`;
  const companyDisplayName = companyName || "Empresa";
  const employeeName = employee?.nombre || userEmail;
  const employeeRole = employee?.role || "staff";
  const employeeEmail = employee?.correo || userEmail;
  const employeePhone = employee?.telefono || "--";
  const employeeProfile = {
    id: employee?.uuid,
    companyId: employee?.id_empresa,
    name: employeeName,
    role: employeeRole,
    email: employeeEmail,
    phone: employeePhone,
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_var(--theme-glow),_var(--background)_55%,_var(--theme-base)_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-8 h-[320px] w-[320px] rounded-full bg-[rgb(var(--supabase-green-rgb)/0.18)] blur-[140px] motion-safe:animate-[floaty_12s_ease-in-out_infinite]" />
        <div className="absolute -bottom-36 left-[-140px] h-[420px] w-[420px] rounded-full bg-[rgb(var(--theme-base-rgb)/0.7)] blur-[140px]" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgb(var(--theme-dot-rgb)/0.08)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <main className={mainClassName}>
        {!authReady ? (
          <AuthLoading />
        ) : hasCompanyAccess ? (
          <DashboardView
            activeKey="panel"
            companyName={companyDisplayName}
            dataError={dataError}
            dataLoading={dataLoading}
            accessToken={session?.access_token || ""}
            employee={employeeProfile}
            employees={employees}
            clients={clients}
            confirmations={confirmations}
            waitlist={waitlist}
            statsAppointments={statsAppointments}
            onSignOut={handleSignOut}
            onRefreshData={refreshDashboardData}
            summary={summary}
            services={services}
            upcomingAppointments={upcomingAppointments}
          />
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
