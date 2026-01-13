const buildErrorMessage = (fallback, error) => {
  if (!error) return fallback;
  const details = error.message || error.details || "";
  return details ? `${fallback} (${details})` : fallback;
};

export const fetchDashboardData = async ({ supabase, userId }) => {
  const errors = [];
  const nowIso = new Date().toISOString();
  const visibleStatuses = ["pendiente", "confirmada", "realizada"];

  const { data: employeeData, error: employeeError } = await supabase
    .from("empleados")
    .select("uuid,id_empresa,nombre,correo,telefono,role")
    .eq("user_id", userId)
    .single();

  if (employeeError || !employeeData) {
    return {
      companyName: "",
      employee: null,
      summary: {
        totalIncome: 0,
        completedCount: 0,
        pendingCount: 0,
        confirmedCount: 0,
      },
      upcomingAppointments: [],
      error: buildErrorMessage(
        "No pudimos cargar los datos del empleado.",
        employeeError
      ),
    };
  }

  const companyPromise = employeeData?.id_empresa
    ? supabase
        .from("empresas")
        .select("nombre")
        .eq("uuid", employeeData.id_empresa)
        .single()
    : Promise.resolve({ data: null, error: null });

  const scopeField = employeeData.role === "boss" ? "id_empresa" : "id_empleado";
  const scopeValue =
    employeeData.role === "boss" ? employeeData.id_empresa : employeeData.uuid;

  const [
    companyResponse,
    completedResponse,
    upcomingResponse,
    pendingResponse,
    confirmedResponse,
  ] = await Promise.all([
    companyPromise,
    supabase
      .from("citas")
      .select("uuid,tiempo_fin,servicios(precio)")
      .eq(scopeField, scopeValue)
      .eq("estado", "realizada"),
    supabase
      .from("citas")
      .select(
        "uuid,tiempo_inicio,tiempo_fin,titulo,estado,clientes(nombre,telefono),servicios(nombre,precio)"
      )
      .eq(scopeField, scopeValue)
      .in("estado", visibleStatuses)
      .gte("tiempo_fin", nowIso)
      .order("tiempo_inicio", { ascending: true })
      .limit(10),
    supabase
      .from("citas")
      .select("uuid", { count: "exact", head: true })
      .eq(scopeField, scopeValue)
      .eq("estado", "pendiente"),
    supabase
      .from("citas")
      .select("uuid", { count: "exact", head: true })
      .eq(scopeField, scopeValue)
      .eq("estado", "confirmada"),
  ]);

  if (companyResponse?.error) {
    errors.push(
      buildErrorMessage("No pudimos cargar la empresa.", companyResponse.error)
    );
  }
  if (completedResponse?.error) {
    errors.push(
      buildErrorMessage(
        "No pudimos cargar las citas realizadas.",
        completedResponse.error
      )
    );
  }
  if (upcomingResponse?.error) {
    errors.push(
      buildErrorMessage(
        "No pudimos cargar las citas futuras.",
        upcomingResponse.error
      )
    );
  }
  if (pendingResponse?.error) {
    errors.push(
      buildErrorMessage(
        "No pudimos cargar las citas pendientes.",
        pendingResponse.error
      )
    );
  }
  if (confirmedResponse?.error) {
    errors.push(
      buildErrorMessage(
        "No pudimos cargar las citas confirmadas.",
        confirmedResponse.error
      )
    );
  }

  const completedAppointments = completedResponse?.data ?? [];
  const totalIncome = completedAppointments.reduce((acc, appointment) => {
    const rawPrice = appointment?.servicios?.precio ?? 0;
    const numericPrice = Number(rawPrice);
    if (Number.isNaN(numericPrice)) return acc;
    return acc + numericPrice;
  }, 0);
  const pendingCount = Number(pendingResponse?.count ?? 0);
  const confirmedCount = Number(confirmedResponse?.count ?? 0);

  return {
    companyName: companyResponse?.data?.nombre ?? "",
    employee: employeeData,
    summary: {
      totalIncome,
      completedCount: completedAppointments.length,
      pendingCount: Number.isNaN(pendingCount) ? 0 : pendingCount,
      confirmedCount: Number.isNaN(confirmedCount) ? 0 : confirmedCount,
    },
    upcomingAppointments: upcomingResponse?.data ?? [],
    error: errors.join(" "),
  };
};
