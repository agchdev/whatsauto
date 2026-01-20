import { buildResponse, requireAuth, requireEmployee } from "../../_helpers";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

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

const normalizeDate = (value) => normalizeText(value).slice(0, 10);

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
      { message: "Solo el jefe puede editar vacaciones." },
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const employeeId = normalizeText(body.employeeId);
  const startDate = normalizeDate(body.fecha_inicio);
  const endDate = normalizeDate(body.fecha_fin);

  if (!employeeId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona un empleado primero." },
      400
    );
  }

  if (!startDate || !endDate) {
    return buildResponse(
      "invalid",
      { message: "Completa las fechas de inicio y fin." },
      400
    );
  }

  if (startDate > endDate) {
    return buildResponse(
      "invalid",
      { message: "La fecha de inicio no puede ser mayor a la de fin." },
      400
    );
  }

  const employeeScope = await ensureEmployee(client, employeeData.id_empresa, employeeId);
  if (employeeScope.error) {
    return buildResponse("not_found", { message: employeeScope.error }, 404);
  }

  const { data, error } = await client
    .from("vacaciones")
    .insert({
      id_empresa: employeeData.id_empresa,
      id_empleado: employeeId,
      fecha_inicio: startDate,
      fecha_fin: endDate,
    })
    .select("uuid,fecha_inicio,fecha_fin")
    .single();

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos guardar las vacaciones.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { vacation: data });
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
      { message: "Solo el jefe puede editar vacaciones." },
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const employeeId = normalizeText(body.employeeId);
  const vacationId = normalizeText(body.vacationId);
  const startDate = normalizeDate(body.fecha_inicio);
  const endDate = normalizeDate(body.fecha_fin);

  if (!employeeId || !vacationId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona unas vacaciones para editar." },
      400
    );
  }

  if (!startDate || !endDate) {
    return buildResponse(
      "invalid",
      { message: "Completa las fechas de inicio y fin." },
      400
    );
  }

  if (startDate > endDate) {
    return buildResponse(
      "invalid",
      { message: "La fecha de inicio no puede ser mayor a la de fin." },
      400
    );
  }

  const employeeScope = await ensureEmployee(client, employeeData.id_empresa, employeeId);
  if (employeeScope.error) {
    return buildResponse("not_found", { message: employeeScope.error }, 404);
  }

  const { error } = await client
    .from("vacaciones")
    .update({ fecha_inicio: startDate, fecha_fin: endDate })
    .eq("uuid", vacationId)
    .eq("id_empleado", employeeId);

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos guardar las vacaciones.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { message: "Vacaciones actualizadas." });
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
      { message: "Solo el jefe puede editar vacaciones." },
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const employeeId = normalizeText(body.employeeId);
  const vacationId = normalizeText(body.vacationId);

  if (!employeeId || !vacationId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona unas vacaciones para eliminar." },
      400
    );
  }

  const employeeScope = await ensureEmployee(client, employeeData.id_empresa, employeeId);
  if (employeeScope.error) {
    return buildResponse("not_found", { message: employeeScope.error }, 404);
  }

  const { error } = await client
    .from("vacaciones")
    .delete()
    .eq("uuid", vacationId)
    .eq("id_empleado", employeeId);

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos eliminar las vacaciones.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { message: "Vacaciones eliminadas." });
}
