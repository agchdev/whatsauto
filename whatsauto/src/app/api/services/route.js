import { buildResponse, requireAuth, requireEmployee } from "../_helpers";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const parseNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const ensureEmployee = async (client, companyId, employeeId) => {
  const { data, error } = await client
    .from("empleados")
    .select("uuid")
    .eq("uuid", employeeId)
    .eq("id_empresa", companyId)
    .single();
  if (error || !data) {
    return { error: "Selecciona el empleado al que se asigna el servicio." };
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
      { message: "Solo el jefe puede crear o editar servicios." },
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = normalizeText(body.name);
  const duration = parseNumber(body.duration);
  const price = parseNumber(body.price);
  const employeeId = normalizeText(body.employeeId);

  if (!name) {
    return buildResponse("invalid", { message: "El nombre es obligatorio." }, 400);
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    return buildResponse(
      "invalid",
      { message: "La duracion debe ser un numero mayor que 0." },
      400
    );
  }
  if (!Number.isFinite(price) || price < 0) {
    return buildResponse(
      "invalid",
      { message: "El precio debe ser un numero valido." },
      400
    );
  }

  const employeeScope = await ensureEmployee(client, employeeData.id_empresa, employeeId);
  if (employeeScope.error) {
    return buildResponse("invalid", { message: employeeScope.error }, 400);
  }

  const { data: createdService, error: serviceError } = await client
    .from("servicios")
    .insert({
      id_empresa: employeeData.id_empresa,
      nombre: name,
      duracion: duration,
      precio: price,
    })
    .select("uuid,nombre,duracion,precio")
    .single();

  if (serviceError) {
    return buildResponse(
      "error",
      { message: "No pudimos guardar el servicio.", details: serviceError.message },
      500
    );
  }

  const { error: linkError } = await client.from("servicios_empleados").insert({
    id_servicio: createdService.uuid,
    id_empleado: employeeId,
  });

  if (linkError) {
    return buildResponse(
      "error",
      {
        message: "No pudimos guardar el servicio.",
        details: linkError.message,
      },
      500
    );
  }

  return buildResponse("ok", { service: createdService });
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
      { message: "Solo el jefe puede crear o editar servicios." },
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const serviceId = normalizeText(body.serviceId);
  const name = normalizeText(body.name);
  const duration = parseNumber(body.duration);
  const price = parseNumber(body.price);
  const employeeId = normalizeText(body.employeeId);

  if (!serviceId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona un servicio para editar." },
      400
    );
  }
  if (!name) {
    return buildResponse("invalid", { message: "El nombre es obligatorio." }, 400);
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    return buildResponse(
      "invalid",
      { message: "La duracion debe ser un numero mayor que 0." },
      400
    );
  }
  if (!Number.isFinite(price) || price < 0) {
    return buildResponse(
      "invalid",
      { message: "El precio debe ser un numero valido." },
      400
    );
  }

  const employeeScope = await ensureEmployee(client, employeeData.id_empresa, employeeId);
  if (employeeScope.error) {
    return buildResponse("invalid", { message: employeeScope.error }, 400);
  }

  const { data: service, error: serviceError } = await client
    .from("servicios")
    .select("uuid")
    .eq("uuid", serviceId)
    .eq("id_empresa", employeeData.id_empresa)
    .single();

  if (serviceError || !service) {
    return buildResponse(
      "not_found",
      { message: "Servicio no encontrado.", details: serviceError?.message },
      404
    );
  }

  const { error: updateError } = await client
    .from("servicios")
    .update({ nombre: name, duracion: duration, precio: price })
    .eq("uuid", serviceId);

  if (updateError) {
    return buildResponse(
      "error",
      { message: "No pudimos guardar el servicio.", details: updateError.message },
      500
    );
  }

  const { error: deleteError } = await client
    .from("servicios_empleados")
    .delete()
    .eq("id_servicio", serviceId);

  if (deleteError) {
    return buildResponse(
      "error",
      { message: "No pudimos guardar el servicio.", details: deleteError.message },
      500
    );
  }

  const { error: assignError } = await client.from("servicios_empleados").insert({
    id_servicio: serviceId,
    id_empleado: employeeId,
  });

  if (assignError) {
    return buildResponse(
      "error",
      { message: "No pudimos guardar el servicio.", details: assignError.message },
      500
    );
  }

  return buildResponse("ok", { message: "Servicio actualizado." });
}
