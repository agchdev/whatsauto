import { buildResponse, requireAuth, requireEmployee } from "../_helpers";

const buildErrorMessage = (fallback, error) => {
  if (!error) return fallback;
  const details = error.message || error.details || "";
  return details ? `${fallback} (${details})` : fallback;
};

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const employeeData = employeeResult.employee;
  const errors = [];
  const now = new Date();
  const nowIso = now.toISOString();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
  const visibleStatuses = ["pendiente", "confirmada", "realizada"];
  const calendarStatuses = [...visibleStatuses, "rechazada", "cancelada"];

  const scopeField = employeeData.role === "boss" ? "id_empresa" : "id_empleado";
  const scopeValue =
    employeeData.role === "boss" ? employeeData.id_empresa : employeeData.uuid;
  const confirmationScope =
    employeeData.role === "boss" ? "citas.id_empresa" : "citas.id_empleado";

  const companyPromise = employeeData?.id_empresa
    ? client
        .from("empresas")
        .select("nombre")
        .eq("uuid", employeeData.id_empresa)
        .single()
    : Promise.resolve({ data: null, error: null });

  const completedPromise = client
    .from("citas")
    .select("uuid,tiempo_fin,servicios(precio)")
    .eq(scopeField, scopeValue)
    .eq("estado", "realizada");

  const upcomingPromise = client
    .from("citas")
    .select(
      "uuid,tiempo_inicio,tiempo_fin,titulo,estado,clientes(nombre,telefono),servicios(nombre,precio)"
    )
    .eq(scopeField, scopeValue)
    .in("estado", calendarStatuses)
    .gte("tiempo_fin", nowIso)
    .order("tiempo_inicio", { ascending: true })
    .limit(10);

  const pendingPromise = client
    .from("citas")
    .select("uuid", { count: "exact", head: true })
    .eq(scopeField, scopeValue)
    .eq("estado", "pendiente");

  const confirmedPromise = client
    .from("citas")
    .select("uuid", { count: "exact", head: true })
    .eq(scopeField, scopeValue)
    .eq("estado", "confirmada");

  const servicesPromise = client
    .from("servicios")
    .select(
      "uuid,nombre,duracion,precio,servicios_empleados(empleados(uuid,nombre,correo))"
    )
    .eq("id_empresa", employeeData.id_empresa)
    .order("nombre", { ascending: true });

  const employeesPromise = client
    .from("empleados")
    .select("uuid,nombre,correo,telefono,dni,role,activo")
    .eq("id_empresa", employeeData.id_empresa)
    .order("nombre", { ascending: true });

  const clientsPromise = client
    .from("clientes")
    .select("uuid,id_empresa,nombre,telefono")
    .eq("id_empresa", employeeData.id_empresa)
    .order("nombre", { ascending: true });

  const confirmationsPromise = client
    .from("confirmaciones")
    .select(
      "uuid,tipo,expires_at,used_at,created_at,citas!inner(uuid,tiempo_inicio,tiempo_fin,titulo,clientes(nombre,telefono),empleados(nombre),servicios(nombre))"
    )
    .eq(confirmationScope, scopeValue)
    .order("created_at", { ascending: false });

  const waitlistPromise = client
    .from("esperas")
    .select(
      "uuid,id_cita,id_cliente,created_at,citas!inner(uuid,tiempo_inicio,tiempo_fin,estado,titulo,empleados(nombre),servicios(nombre)),clientes(uuid,nombre,telefono)"
    )
    .eq("citas.id_empresa", employeeData.id_empresa)
    .order("created_at", { ascending: false });

  const statsPromise = client
    .from("citas")
    .select(
      "uuid,tiempo_inicio,estado,clientes(uuid,nombre),empleados(uuid,nombre),servicios(uuid,nombre)"
    )
    .eq(scopeField, scopeValue)
    .in("estado", visibleStatuses)
    .gte("tiempo_inicio", startOfYear.toISOString())
    .lt("tiempo_inicio", endOfYear.toISOString());

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
    statsResponse,
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
    statsPromise,
  ]);

  if (companyResponse?.error) {
    errors.push(buildErrorMessage("No pudimos cargar la empresa.", companyResponse.error));
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
      buildErrorMessage("No pudimos cargar las citas futuras.", upcomingResponse.error)
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
  if (statsResponse?.error) {
    errors.push(
      buildErrorMessage("No pudimos cargar las estadisticas.", statsResponse.error)
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

  return buildResponse("ok", {
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
    statsAppointments: statsResponse?.data ?? [],
    error: errors.join(" "),
  });
}
