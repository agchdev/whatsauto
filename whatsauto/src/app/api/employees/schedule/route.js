import { buildResponse, requireAuth, requireEmployee } from "../../_helpers";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeTime = (value) => (value ? String(value).slice(0, 5) : "");

const parseDay = (value) => Number(value);

const ensureEmployee = async (client, companyId, employeeId) => {
  const { data, error } = await client
    .from("empleados")
    .select("uuid")
    .eq("uuid", employeeId)
    .eq("id_empresa", companyId)
    .single();
  if (error || !data) {
    return { error: "Empleado no encontrado." };
  }
  return { data };
};

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const employeeData = employeeResult.employee;
  if (employeeData.role !== "boss") {
    return buildResponse(
      "forbidden",
      { message: "Solo el jefe puede editar horarios." },
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const employeeId = normalizeText(body.employeeId);
  const dayNumber = parseDay(body.dia_semana);

  if (!employeeId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona un empleado primero." },
      400
    );
  }

  if (!dayNumber || dayNumber < 1 || dayNumber > 7) {
    return buildResponse(
      "invalid",
      { message: "El dia debe estar entre 1 y 7." },
      400
    );
  }

  const employeeScope = await ensureEmployee(client, employeeData.id_empresa, employeeId);
  if (employeeScope.error) {
    return buildResponse("not_found", { message: employeeScope.error }, 404);
  }

  const payload = {
    id_empresa: employeeData.id_empresa,
    id_empleado: employeeId,
    dia_semana: dayNumber,
    hora_entrada: normalizeTime(body.hora_entrada) || null,
    hora_salida: normalizeTime(body.hora_salida) || null,
    hora_descanso_inicio: normalizeTime(body.hora_descanso_inicio) || null,
    hora_descanso_fin: normalizeTime(body.hora_descanso_fin) || null,
  };

  const { data, error } = await client
    .from("horarios")
    .insert(payload)
    .select("uuid,dia_semana,hora_entrada,hora_salida,hora_descanso_inicio,hora_descanso_fin")
    .single();

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos guardar el horario.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { schedule: data });
}

export async function PATCH(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const employeeData = employeeResult.employee;
  if (employeeData.role !== "boss") {
    return buildResponse(
      "forbidden",
      { message: "Solo el jefe puede editar horarios." },
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const employeeId = normalizeText(body.employeeId);
  const scheduleId = normalizeText(body.scheduleId);
  const dayNumber = parseDay(body.dia_semana);

  if (!employeeId || !scheduleId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona un horario para editar." },
      400
    );
  }

  if (!dayNumber || dayNumber < 1 || dayNumber > 7) {
    return buildResponse(
      "invalid",
      { message: "El dia debe estar entre 1 y 7." },
      400
    );
  }

  const employeeScope = await ensureEmployee(client, employeeData.id_empresa, employeeId);
  if (employeeScope.error) {
    return buildResponse("not_found", { message: employeeScope.error }, 404);
  }

  const { error } = await client
    .from("horarios")
    .update({
      dia_semana: dayNumber,
      hora_entrada: normalizeTime(body.hora_entrada) || null,
      hora_salida: normalizeTime(body.hora_salida) || null,
      hora_descanso_inicio: normalizeTime(body.hora_descanso_inicio) || null,
      hora_descanso_fin: normalizeTime(body.hora_descanso_fin) || null,
    })
    .eq("uuid", scheduleId)
    .eq("id_empleado", employeeId);

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos guardar el horario.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { message: "Horario actualizado." });
}

export async function DELETE(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const employeeData = employeeResult.employee;
  if (employeeData.role !== "boss") {
    return buildResponse(
      "forbidden",
      { message: "Solo el jefe puede editar horarios." },
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const employeeId = normalizeText(body.employeeId);
  const scheduleId = normalizeText(body.scheduleId);

  if (!employeeId || !scheduleId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona un horario para eliminar." },
      400
    );
  }

  const employeeScope = await ensureEmployee(client, employeeData.id_empresa, employeeId);
  if (employeeScope.error) {
    return buildResponse("not_found", { message: employeeScope.error }, 404);
  }

  const { error } = await client
    .from("horarios")
    .delete()
    .eq("uuid", scheduleId)
    .eq("id_empleado", employeeId);

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos eliminar el horario.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { message: "Horario eliminado." });
}
