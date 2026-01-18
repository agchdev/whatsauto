"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PALETTE_KEY, NAV_ITEMS } from "../../constants";
import {
  applyPalette,
  loadStoredPalette,
  persistPalette,
  THEME_STORAGE_KEY,
} from "../../lib/theme";
import AppointmentsCalendar from "./AppointmentsCalendar";
import CompanyHeader from "./CompanyHeader";
import ConfirmationsTable from "./ConfirmationsTable";
import ClientsPanel from "./ClientsPanel";
import CreationSuccessModal from "./CreationSuccessModal";
import EmployeesPanel from "./EmployeesPanel";
import Sidebar from "./Sidebar";
import ServicesPanel from "./ServicesPanel";
import StatsSummary from "./StatsSummary";
import StatisticsPanel from "./StatisticsPanel";
import UpcomingAppointmentsTable from "./UpcomingAppointmentsTable";
import WaitlistPanel from "./WaitlistPanel";

export default function DashboardView({
  activeKey: initialActiveKey = "panel",
  companyName,
  dataError,
  dataLoading,
  employee,
  employees,
  clients,
  confirmations,
  waitlist,
  summary,
  statsAppointments,
  services,
  upcomingAppointments,
  onSignOut,
  onRefreshData,
}) {
  const [activeKey, setActiveKey] = useState(initialActiveKey);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [paletteKey, setPaletteKey] = useState(() => loadStoredPalette());
  const [creationModal, setCreationModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    key: 0,
  });

  useEffect(() => {
    setActiveKey(initialActiveKey);
  }, [initialActiveKey]);

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
      const nextKey = event.newValue || DEFAULT_PALETTE_KEY;
      setPaletteKey(nextKey);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!creationModal.isOpen) return;
    const timer = setTimeout(() => {
      setCreationModal((prev) => ({ ...prev, isOpen: false }));
    }, 2200);
    return () => clearTimeout(timer);
  }, [creationModal.isOpen, creationModal.key]);

  const handleCreated = ({ title, message } = {}) => {
    setCreationModal((prev) => ({
      isOpen: true,
      title: title || "Listo",
      message: message || "Creado correctamente.",
      key: prev.key + 1,
    }));
  };

  const closeCreationModal = () => {
    setCreationModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleToggleSidebar = () => {
    setSidebarExpanded((prev) => !prev);
  };

  const handleNavigate = (key) => {
    setActiveKey(key);
    setIsMobileNavOpen(false);
  };

  const isEmployeesView = activeKey === "empleados";
  const isClientsView = activeKey === "clientes";
  const isServicesView = activeKey === "servicios";
  const isAppointmentsView = activeKey === "citas";
  const isWaitlistView = activeKey === "esperas";
  const isStatsView = activeKey === "estadisticas";
  const activeLabel =
    NAV_ITEMS.find((item) => item.key === activeKey)?.label || "Panel";

  return (
    <div className="relative flex w-full">
      <Sidebar
        activeKey={activeKey}
        employeeEmail={employee.email}
        employeeName={employee.name}
        employeeRole={employee.role}
        isExpanded={sidebarExpanded}
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
        onNavigate={handleNavigate}
        onToggle={handleToggleSidebar}
        onPaletteChange={setPaletteKey}
        onSignOut={onSignOut}
        paletteKey={paletteKey}
      />

      <div
        className={`relative flex-1 transition-[padding] duration-300 ${
          sidebarExpanded ? "md:pl-72" : "md:pl-20"
        }`}
      >
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
          <div className="flex items-center justify-between gap-3 md:hidden">
            <button
              aria-label="Abrir menu"
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-[color:var(--muted-strong)] shadow-[0_16px_40px_-30px_rgba(0,0,0,0.8)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
              onClick={() => setIsMobileNavOpen(true)}
              type="button"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h12" />
              </svg>
            </button>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {activeLabel}
              </p>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                {companyName}
              </p>
            </div>
          </div>
          <CompanyHeader companyName={companyName} dataLoading={dataLoading} />

          {dataError && (
            <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
              {dataError}
            </div>
          )}

          {isEmployeesView ? (
            <EmployeesPanel
              canManage={employee.role === "boss"}
              companyId={employee.companyId}
              employees={employees}
              isLoading={dataLoading}
              onRefresh={onRefreshData}
            />
          ) : isClientsView ? (
            <ClientsPanel
              clients={clients}
              isLoading={dataLoading}
              onRefresh={onRefreshData}
            />
          ) : isServicesView ? (
            <ServicesPanel
              canManage={employee.role === "boss"}
              companyId={employee.companyId}
              employees={employees}
              isLoading={dataLoading}
              onRefresh={onRefreshData}
              services={services}
            />
          ) : isWaitlistView ? (
            <WaitlistPanel
              clients={clients}
              companyId={employee.companyId}
              isLoading={dataLoading}
              onRefresh={onRefreshData}
              waitlist={waitlist}
            />
          ) : isStatsView ? (
            <StatisticsPanel
              appointments={statsAppointments}
              isLoading={dataLoading}
            />
          ) : isAppointmentsView ? (
            <>
              <AppointmentsCalendar
                appointments={upcomingAppointments}
                clients={clients}
                employees={employees}
                services={services}
                currentEmployee={employee}
                companyId={employee.companyId}
                isLoading={dataLoading}
                onCreated={handleCreated}
                onRefresh={onRefreshData}
              />
              <ConfirmationsTable
                confirmations={confirmations}
                isLoading={dataLoading}
              />
            </>
          ) : (
            <>
              <StatsSummary
                completedCount={summary.completedCount}
                confirmedCount={summary.confirmedCount}
                isLoading={dataLoading}
                pendingCount={summary.pendingCount}
                totalIncome={summary.totalIncome}
              />
              <UpcomingAppointmentsTable
                appointments={upcomingAppointments}
                isLoading={dataLoading}
              />
            </>
          )}
        </section>
      </div>

      <CreationSuccessModal
        isOpen={creationModal.isOpen}
        message={creationModal.message}
        onClose={closeCreationModal}
        title={creationModal.title}
      />
    </div>
  );
}
