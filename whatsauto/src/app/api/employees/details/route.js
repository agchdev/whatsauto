import { buildResponse, requireAuth, requireEmployee } from "../../_helpers";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const employeeData = employeeResult.employee;
  const url = new URL(request.url);
  const employeeId = normalizeText(url.searchParams.get("employeeId"));

  if (!employeeId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona un empleado primero." },
      400
    );
  }

  const { data: targetEmployee, error: targetError } = await client
    .from("empleados")
    .select("uuid")
    .eq("uuid", employeeId)
    .eq("id_empresa", employeeData.id_empresa)
    .single();

  if (targetError || !targetEmployee) {
    return buildResponse(
      "not_found",
      { message: "Empleado no encontrado.", details: targetError?.message },
      404
    );
  }

  const [scheduleResponse, vacationsResponse] = await Promise.all([
    client
      .from("horarios")
      .select(
        "uuid,dia_semana,hora_entrada,hora_salida,hora_descanso_inicio,hora_descanso_fin"
      )
      .eq("id_empleado", employeeId)
      .order("dia_semana", { ascending: true }),
    client
      .from("vacaciones")
      .select("uuid,fecha_inicio,fecha_fin")
      .eq("id_empleado", employeeId)
      .order("fecha_inicio", { ascending: false }),
  ]);

  if (scheduleResponse.error) {
    return buildResponse(
      "error",
      {
        message: "No pudimos cargar los horarios.",
        details: scheduleResponse.error.message,
      },
      500
    );
  }

  if (vacationsResponse.error) {
    return buildResponse(
      "error",
      {
        message: "No pudimos cargar las vacaciones.",
        details: vacationsResponse.error.message,
      },
      500
    );
  }

  return buildResponse("ok", {
    schedule: scheduleResponse.data ?? [],
    vacations: vacationsResponse.data ?? [],
  });
}
