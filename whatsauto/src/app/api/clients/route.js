import { buildResponse, requireAuth, requireEmployee } from "../_helpers";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

export async function PATCH(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const employeeData = employeeResult.employee;
  const body = await request.json().catch(() => ({}));
  const clientId = normalizeText(body.clientId);
  const name = normalizeText(body.name);
  const phone = normalizeText(body.phone);

  if (!clientId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona un cliente para editar." },
      400
    );
  }

  if (!name) {
    return buildResponse("invalid", { message: "El nombre es obligatorio." }, 400);
  }

  const { data: existing, error: existingError } = await client
    .from("clientes")
    .select("uuid")
    .eq("uuid", clientId)
    .eq("id_empresa", employeeData.id_empresa)
    .single();

  if (existingError || !existing) {
    return buildResponse(
      "not_found",
      { message: "Cliente no encontrado.", details: existingError?.message },
      404
    );
  }

  const { data, error } = await client
    .from("clientes")
    .update({ nombre: name, telefono: phone || null })
    .eq("uuid", clientId)
    .select("uuid,nombre,telefono")
    .single();

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos actualizar el cliente.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { client: data });
}
