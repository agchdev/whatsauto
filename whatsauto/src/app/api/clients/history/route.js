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
  const clientId = normalizeText(url.searchParams.get("clientId"));

  if (!clientId) {
    return buildResponse(
      "invalid",
      { message: "Selecciona un cliente para editar." },
      400
    );
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
    .from("citas")
    .select(
      "uuid,estado,tiempo_inicio,tiempo_fin,servicios(nombre,precio,duracion),empleados(nombre)"
    )
    .eq("id_cliente", clientId)
    .order("tiempo_inicio", { ascending: false });

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos cargar el historial.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { history: data ?? [] });
}
