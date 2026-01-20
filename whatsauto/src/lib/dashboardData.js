const emptyResult = {
  companyName: "",
  employee: null,
  summary: {
    totalIncome: 0,
    completedCount: 0,
    pendingCount: 0,
    confirmedCount: 0,
  },
  clients: [],
  services: [],
  employees: [],
  upcomingAppointments: [],
  confirmations: [],
  waitlist: [],
  statsAppointments: [],
  error: "",
};

export const fetchDashboardData = async ({ accessToken }) => {
  if (!accessToken || typeof fetch !== "function") {
    return {
      ...emptyResult,
      error: "Sesion invalida. Inicia sesion otra vez.",
    };
  }

  try {
    const response = await fetch("/api/dashboard", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.status !== "ok") {
      return {
        ...emptyResult,
        error: payload.message || "No pudimos cargar los datos del panel.",
      };
    }

    return {
      companyName: payload.companyName || "",
      employee: payload.employee || null,
      summary: payload.summary || emptyResult.summary,
      clients: payload.clients || [],
      services: payload.services || [],
      employees: payload.employees || [],
      upcomingAppointments: payload.upcomingAppointments || [],
      confirmations: payload.confirmations || [],
      waitlist: payload.waitlist || [],
      statsAppointments: payload.statsAppointments || [],
      error: payload.error || "",
    };
  } catch (error) {
    return {
      ...emptyResult,
      error: error?.message || "No pudimos cargar los datos del panel.",
    };
  }
};
