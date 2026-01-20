import { randomBytes, randomUUID } from "crypto";
import { buildResponse, requireAuth, requireEmployee } from "../../_helpers";

const AVAILABLE_STATES = new Set(["rechazada", "cancelada"]);

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const createToken = () => {
  if (typeof randomUUID === "function") return randomUUID();
  return randomBytes(16).toString("hex");
};

export async function POST(request) {
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
      { message: "Selecciona una espera para asignar." },
      400
    );
  }

  const { data: entry, error: entryError } = await client
    .from("esperas")
    .select("uuid,id_cita,id_cliente,citas(id_empresa,estado,tiempo_inicio)")
    .eq("uuid", entryId)
    .maybeSingle();

  if (entryError) {
    return buildResponse(
      "error",
      { message: "No pudimos cargar la espera.", details: entryError.message },
      500
    );
  }

  if (!entry || entry.citas?.id_empresa !== employeeData.id_empresa) {
    return buildResponse("not_found", { message: "Espera no encontrada." }, 404);
  }

  if (!entry.id_cita || !entry.id_cliente) {
    return buildResponse(
      "error",
      { message: "No encontramos el cliente de la lista de espera." },
      500
    );
  }

  const { data: updated, error: updateError } = await client
    .from("citas")
    .update({
      id_cliente: entry.id_cliente,
      estado: "pendiente",
      updated_at: new Date().toISOString(),
    })
    .eq("uuid", entry.id_cita)
    .in("estado", Array.from(AVAILABLE_STATES))
    .select("uuid,tiempo_inicio")
    .maybeSingle();

  if (updateError) {
    return buildResponse(
      "error",
      { message: "No pudimos actualizar la cita.", details: updateError.message },
      500
    );
  }

  if (!updated) {
    return buildResponse(
      "locked",
      { message: "La cita ya no esta disponible para reasignar." },
      409
    );
  }

  const token = createToken();
  const { error: confirmationError } = await client
    .from("confirmaciones")
    .insert({
      id_cita: updated.uuid,
      token_hash: token,
      expires_at: updated.tiempo_inicio,
      tipo: "confirmar",
    });

  if (confirmationError) {
    return buildResponse(
      "error",
      {
        message: "La cita se actualizo, pero no pudimos generar la confirmacion.",
        details: confirmationError.message,
      },
      500
    );
  }

  const { error: deleteError } = await client
    .from("esperas")
    .delete()
    .eq("uuid", entry.uuid);

  if (deleteError) {
    return buildResponse(
      "error",
      {
        message: "La cita se asigno, pero no pudimos eliminar la espera.",
        details: deleteError.message,
      },
      500
    );
  }

  return buildResponse("ok", {
    token,
    message: "Cliente asignado. Confirmacion generada.",
  });
}
