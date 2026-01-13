"use client";

import { useEffect, useState } from "react";
import AuthLoading from "../components/auth/AuthLoading";
import LoginView from "../components/auth/LoginView";
import DashboardView from "../components/dashboard/DashboardView";
import { fetchDashboardData } from "../lib/dashboardData";
import { supabase } from "../lib/supabaseClient";

const initialStatus = { type: "idle", message: "" };

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [employee, setEmployee] = useState(null);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    completedCount: 0,
    pendingCount: 0,
    confirmedCount: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
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
  }, []);

  useEffect(() => {
    if (!session) {
      setCompanyName("");
      setEmployee(null);
      setSummary({
        totalIncome: 0,
        completedCount: 0,
        pendingCount: 0,
        confirmedCount: 0,
      });
      setUpcomingAppointments([]);
      setDataLoading(false);
      setDataError("");
      return;
    }

    let active = true;

    const loadDashboardData = async () => {
      setDataLoading(true);
      setDataError("");

      const result = await fetchDashboardData({
        supabase,
        userId: session.user.id,
      });

      if (!active) return;

      setCompanyName(result.companyName);
      setEmployee(result.employee);
      setSummary(result.summary);
      setUpcomingAppointments(result.upcomingAppointments);
      setDataError(result.error);
      setDataLoading(false);
    };

    loadDashboardData();

    return () => {
      active = false;
    };
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

    const { error } = await supabase.auth.signInWithOtp({
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
  const userEmail = session?.user?.email ?? "Equipo";
  const mainAlignment =
    !authReady || !hasSession ? "items-center" : "items-stretch";
  const mainClassName = hasSession
    ? "relative flex min-h-screen w-full px-0 py-0"
    : `relative mx-auto flex min-h-screen max-w-6xl px-6 py-12 sm:py-16 ${mainAlignment}`;
  const companyDisplayName = companyName || "Empresa";
  const employeeName = employee?.nombre || userEmail;
  const employeeRole = employee?.role || "staff";
  const employeeEmail = employee?.correo || userEmail;
  const employeePhone = employee?.telefono || "--";
  const employeeProfile = {
    name: employeeName,
    role: employeeRole,
    email: employeeEmail,
    phone: employeePhone,
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
        ) : hasSession ? (
          <DashboardView
            activeKey="panel"
            companyName={companyDisplayName}
            dataError={dataError}
            dataLoading={dataLoading}
            employee={employeeProfile}
            onSignOut={handleSignOut}
            summary={summary}
            upcomingAppointments={upcomingAppointments}
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
