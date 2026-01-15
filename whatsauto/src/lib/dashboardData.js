const buildErrorMessage = (fallback, error) => {
  if (!error) return fallback;
  const details = error.message || error.details || "";
  return details ? `${fallback} (${details})` : fallback;
};

const fetchConfirmationsFromApi = async (accessToken) => {
  if (!accessToken || typeof fetch !== "function") {
    return { data: null, error: new Error("Missing access token.") };
  }

  try {
    const response = await fetch("/api/confirmations", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.status !== "ok") {
      const message =
        payload.message || "No pudimos cargar las confirmaciones.";
      return { data: null, error: new Error(message) };
    }

    return {
      data: Array.isArray(payload.confirmations) ? payload.confirmations : [],
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
};

export const fetchDashboardData = async ({ supabase, userId, accessToken }) => {
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
      clients: [],
      services: [],
      employees: [],
      upcomingAppointments: [],
      confirmations: [],
      waitlist: [],
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
  const confirmationScope =
    employeeData.role === "boss" ? "citas.id_empresa" : "citas.id_empleado";

  // Citas realizadas: base para ingresos. Cambia el estado si tu regla de ingresos es distinta.
  const completedPromise = supabase
    .from("citas")
    .select("uuid,tiempo_fin,servicios(precio)")
    .eq(scopeField, scopeValue)
    .eq("estado", "realizada");

  // Citas futuras: mostramos solo pendientes/confirmadas/realizadas por claridad.
  // Ajusta "visibleStatuses" si quieres incluir o excluir estados.
  const upcomingPromise = supabase
    .from("citas")
    .select(
      "uuid,tiempo_inicio,tiempo_fin,titulo,estado,clientes(nombre,telefono),servicios(nombre,precio)"
    )
    .eq(scopeField, scopeValue)
    .in("estado", visibleStatuses)
    .gte("tiempo_fin", nowIso)
    .order("tiempo_inicio", { ascending: true })
    .limit(10);

  // Conteos para el resumen. Usamos head:true para no traer filas, solo el count.
  const pendingPromise = supabase
    .from("citas")
    .select("uuid", { count: "exact", head: true })
    .eq(scopeField, scopeValue)
    .eq("estado", "pendiente");

  const confirmedPromise = supabase
    .from("citas")
    .select("uuid", { count: "exact", head: true })
    .eq(scopeField, scopeValue)
    .eq("estado", "confirmada");

  // Servicios de la empresa con empleados asignados.
  // Modifica el select para agregar/quitar campos o relaciones.
  const servicesPromise = supabase
    .from("servicios")
    .select(
      "uuid,nombre,duracion,precio,servicios_empleados(empleados(uuid,nombre,correo))"
    )
    .eq("id_empresa", employeeData.id_empresa)
    .order("nombre", { ascending: true });

  // Lista de empleados para el panel de empleados y asignaciones.
  // Modifica este select si quieres mostrar mas campos o filtrar por role/activo.
  const employeesPromise = supabase
    .from("empleados")
    .select("uuid,nombre,correo,telefono,dni,role,activo")
    .eq("id_empresa", employeeData.id_empresa)
    .order("nombre", { ascending: true });

  // Lista de clientes de la empresa.
  // Ajusta la seleccion si quieres mas campos (direccion, notas, etc).
  const clientsPromise = supabase
    .from("clientes")
    .select("uuid,id_empresa,nombre,telefono")
    .eq("id_empresa", employeeData.id_empresa)
    .order("nombre", { ascending: true });

  const confirmationsPromise = accessToken
    ? fetchConfirmationsFromApi(accessToken)
    : supabase
        .from("confirmaciones")
        .select(
          "uuid,tipo,expires_at,used_at,created_at,citas!inner(uuid,tiempo_inicio,tiempo_fin,titulo,clientes(nombre,telefono),empleados(nombre),servicios(nombre))"
        )
        .eq(confirmationScope, scopeValue)
        .order("created_at", { ascending: false });

  const waitlistPromise = supabase
    .from("esperas")
    .select(
      "uuid,id_cita,id_cliente,created_at,citas!inner(uuid,tiempo_inicio,tiempo_fin,estado,titulo,empleados(nombre),servicios(nombre)),clientes(uuid,nombre,telefono)"
    )
    .eq("citas.id_empresa", employeeData.id_empresa)
    .order("created_at", { ascending: false });

  const [
    companyResponse,
    completedResponse,
    upcomingResponse,
    pendingResponse,
    confirmedResponse,
    servicesResponse,
    employeesResponse,
    clientsResponse,
    confirmationsResponse,
    waitlistResponse,
  ] = await Promise.all([
    companyPromise,
    completedPromise,
    upcomingPromise,
    pendingPromise,
    confirmedPromise,
    servicesPromise,
    employeesPromise,
    clientsPromise,
    confirmationsPromise,
    waitlistPromise,
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
  if (servicesResponse?.error) {
    errors.push(
      buildErrorMessage("No pudimos cargar los servicios.", servicesResponse.error)
    );
  }
  if (employeesResponse?.error) {
    errors.push(
      buildErrorMessage("No pudimos cargar los empleados.", employeesResponse.error)
    );
  }
  if (clientsResponse?.error) {
    errors.push(
      buildErrorMessage("No pudimos cargar los clientes.", clientsResponse.error)
    );
  }
  if (confirmationsResponse?.error) {
    errors.push(
      buildErrorMessage(
        "No pudimos cargar las confirmaciones.",
        confirmationsResponse.error
      )
    );
  }
  if (waitlistResponse?.error) {
    errors.push(
      buildErrorMessage("No pudimos cargar la lista de espera.", waitlistResponse.error)
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
    clients: clientsResponse?.data ?? [],
    services: servicesResponse?.data ?? [],
    employees: employeesResponse?.data ?? [],
    upcomingAppointments: upcomingResponse?.data ?? [],
    confirmations: confirmationsResponse?.data ?? [],
    waitlist: waitlistResponse?.data ?? [],
    error: errors.join(" "),
  };
};
