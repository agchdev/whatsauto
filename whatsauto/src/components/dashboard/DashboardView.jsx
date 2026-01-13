"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PALETTE_KEY } from "../../constants";
import {
  applyPalette,
  loadStoredPalette,
  persistPalette,
  THEME_STORAGE_KEY,
} from "../../lib/theme";
import CompanyHeader from "./CompanyHeader";
import Sidebar from "./Sidebar";
import StatsSummary from "./StatsSummary";
import UpcomingAppointmentsTable from "./UpcomingAppointmentsTable";

export default function DashboardView({
  activeKey = "panel",
  companyName,
  dataError,
  dataLoading,
  employee,
  summary,
  upcomingAppointments,
  onSignOut,
}) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [paletteKey, setPaletteKey] = useState(() => loadStoredPalette());

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

  const handleToggleSidebar = () => {
    setSidebarExpanded((prev) => !prev);
  };

  return (
    <div className="relative flex w-full">
      <Sidebar
        activeKey={activeKey}
        employeeEmail={employee.email}
        employeeName={employee.name}
        employeeRole={employee.role}
        isExpanded={sidebarExpanded}
        onToggle={handleToggleSidebar}
        onPaletteChange={setPaletteKey}
        onSignOut={onSignOut}
        paletteKey={paletteKey}
      />

      <div
        className={`relative flex-1 transition-[padding] duration-300 ${
          sidebarExpanded ? "pl-72" : "pl-20"
        }`}
      >
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
          <CompanyHeader companyName={companyName} dataLoading={dataLoading} />

          {dataError && (
            <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
              {dataError}
            </div>
          )}

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
        </section>
      </div>
    </div>
  );
}
