import { randomUUID } from "crypto";
import { buildResponse, requireAuth, requireEmployee } from "../_helpers";

const WAITLIST_SELECT =
  "uuid,id_cita,id_cliente,created_at,citas!inner(uuid,tiempo_inicio,tiempo_fin,estado,titulo,empleados(nombre),servicios(nombre)),clientes(uuid,nombre,telefono)";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const ensureAppointment = async (client, companyId, appointmentId) => {
  const { data, error } = await client
    .from("citas")
    .select("uuid")
    .eq("uuid", appointmentId)
    .eq("id_empresa", companyId)
    .single();
  if (error || !data) {
    return { error: "Cita no encontrada." };
  }
  return { data };
};

const ensureClient = async (client, companyId, clientId) => {
  const { data, error } = await client
    .from("clientes")
    .select("uuid")
    .eq("uuid", clientId)
    .eq("id_empresa", companyId)
    .single();
  if (error || !data) {
    return { error: "Cliente no encontrado." };
  }
  return { data };
};

const ensureEntry = async (client, companyId, entryId) => {
  const { data, error } = await client
    .from("esperas")
    .select("uuid,id_cita,citas(id_empresa)")
    .eq("uuid", entryId)
    .maybeSingle();

  if (error || !data || data.citas?.id_empresa !== companyId) {
    return { error: "Espera no encontrada." };
  }

  return { data };
};

const buildConfirmationExpiry = (entry) => {
  const appointmentStart = entry?.citas?.tiempo_inicio;
  if (appointmentStart) return appointmentStart;
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
};

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const employeeData = employeeResult.employee;
  const body = await request.json().catch(() => ({}));
  const appointmentId = normalizeText(body.appointmentId);
  const clientId = normalizeText(body.clientId);

  if (!appointmentId || !clientId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona una cita y un cliente." },
      400
    );
  }

  const appointmentCheck = await ensureAppointment(
    client,
    employeeData.id_empresa,
    appointmentId
  );
  if (appointmentCheck.error) {
    return buildResponse("not_found", { message: appointmentCheck.error }, 404);
  }

  const clientCheck = await ensureClient(client, employeeData.id_empresa, clientId);
  if (clientCheck.error) {
    return buildResponse("not_found", { message: clientCheck.error }, 404);
  }

  const { data, error } = await client
    .from("esperas")
    .insert({ id_cita: appointmentId, id_cliente: clientId })
    .select(WAITLIST_SELECT)
    .single();

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos guardar la espera.", details: error.message },
      500
    );
  }

  const token = randomUUID();
  const expiresAt = buildConfirmationExpiry(data);
  const { error: confirmationError } = await client
    .from("confirmaciones_esperas")
    .insert({
      id_espera: data.uuid,
      token_hash: token,
      expires_at: expiresAt,
    });

  if (confirmationError) {
    return buildResponse(
      "error",
      {
        message: "La espera se creo, pero no pudimos generar la confirmacion.",
        details: confirmationError.message,
      },
      500
    );
  }

  return buildResponse("ok", {
    entry: data,
    token,
    message: "Espera creada. Confirmacion generada.",
  });
}

export async function PATCH(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const employeeData = employeeResult.employee;
  const body = await request.json().catch(() => ({}));
  const entryId = normalizeText(body.entryId);
  const appointmentId = normalizeText(body.appointmentId);
  const clientId = normalizeText(body.clientId);

  if (!entryId || !appointmentId || !clientId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona una cita y un cliente." },
      400
    );
  }

  const entryCheck = await ensureEntry(client, employeeData.id_empresa, entryId);
  if (entryCheck.error) {
    return buildResponse("not_found", { message: entryCheck.error }, 404);
  }

  const appointmentCheck = await ensureAppointment(
    client,
    employeeData.id_empresa,
    appointmentId
  );
  if (appointmentCheck.error) {
    return buildResponse("not_found", { message: appointmentCheck.error }, 404);
  }

  const clientCheck = await ensureClient(client, employeeData.id_empresa, clientId);
  if (clientCheck.error) {
    return buildResponse("not_found", { message: clientCheck.error }, 404);
  }

  const { data, error } = await client
    .from("esperas")
    .update({ id_cita: appointmentId, id_cliente: clientId })
    .eq("uuid", entryId)
    .select(WAITLIST_SELECT)
    .single();

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos guardar la espera.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { entry: data });
}

export async function DELETE(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const employeeData = employeeResult.employee;
  const body = await request.json().catch(() => ({}));
  const entryId = normalizeText(body.entryId);

  if (!entryId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona una espera para eliminar." },
      400
    );
  }

  const entryCheck = await ensureEntry(client, employeeData.id_empresa, entryId);
  if (entryCheck.error) {
    return buildResponse("not_found", { message: entryCheck.error }, 404);
  }

  const { error } = await client.from("esperas").delete().eq("uuid", entryId);

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos eliminar la espera.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { message: "Espera eliminada." });
}
