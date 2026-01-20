import { buildResponse, requireAuth, requireEmployee } from "../_helpers";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeRole = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

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
      { message: "Solo el jefe puede editar empleados." },
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = normalizeText(body.name);
  const email = normalizeText(body.email);
  const phone = normalizeText(body.phone);
  const dni = normalizeText(body.dni);
  const role = normalizeRole(body.role);
  const active = body.active === false ? false : Boolean(body.active);

  if (!name) {
    return buildResponse("invalid", { message: "El nombre es obligatorio." }, 400);
  }

  if (!["boss", "staff"].includes(role)) {
    return buildResponse(
      "invalid",
      { message: "El rol debe ser boss o staff." },
      400
    );
  }

  const { data, error } = await client
    .from("empleados")
    .insert({
      id_empresa: employeeData.id_empresa,
      nombre: name,
      correo: email || null,
      telefono: phone || null,
      dni: dni || null,
      role,
      activo: active,
    })
    .select("uuid,nombre,correo,telefono,dni,role,activo")
    .single();

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos crear el empleado.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { employee: data });
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
      { message: "Solo el jefe puede editar empleados." },
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const employeeId = normalizeText(body.employeeId);
  const name = normalizeText(body.name);
  const email = normalizeText(body.email);
  const phone = normalizeText(body.phone);
  const dni = normalizeText(body.dni);
  const role = normalizeRole(body.role);
  const active = body.active === false ? false : Boolean(body.active);

  if (!employeeId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona un empleado para editar." },
      400
    );
  }

  if (!name) {
    return buildResponse("invalid", { message: "El nombre es obligatorio." }, 400);
  }

  if (!["boss", "staff"].includes(role)) {
    return buildResponse(
      "invalid",
      { message: "El rol debe ser boss o staff." },
      400
    );
  }

  const { data: existing, error: existingError } = await client
    .from("empleados")
    .select("uuid")
    .eq("uuid", employeeId)
    .eq("id_empresa", employeeData.id_empresa)
    .single();

  if (existingError || !existing) {
    return buildResponse(
      "not_found",
      { message: "Empleado no encontrado.", details: existingError?.message },
      404
    );
  }

  const { error } = await client
    .from("empleados")
    .update({
      nombre: name,
      correo: email || null,
      telefono: phone || null,
      dni: dni || null,
      role,
      activo: active,
    })
    .eq("uuid", employeeId);

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos actualizar el empleado.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { message: "Empleado actualizado." });
}
