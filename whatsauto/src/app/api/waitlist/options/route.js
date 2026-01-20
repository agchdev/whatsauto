import { buildResponse, requireAuth, requireEmployee } from "../../_helpers";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const employeeData = employeeResult.employee;
  const nowIso = new Date().toISOString();

  const { data, error } = await client
    .from("citas")
    .select(
      "uuid,tiempo_inicio,tiempo_fin,estado,titulo,clientes(nombre,telefono),servicios(nombre),empleados(nombre)"
    )
    .eq("id_empresa", employeeData.id_empresa)
    .gte("tiempo_fin", nowIso)
    .order("tiempo_inicio", { ascending: true })
    .limit(200);

  if (error) {
    return buildResponse(
      "error",
      { message: "No pudimos cargar las citas.", details: error.message },
      500
    );
  }

  return buildResponse("ok", { appointments: data ?? [] });
}
