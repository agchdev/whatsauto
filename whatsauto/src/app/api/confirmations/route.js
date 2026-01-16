import { randomBytes, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

const CONFIRMATIONS_SELECT =
  "uuid,tipo,expires_at,used_at,created_at,citas!inner(uuid,tiempo_inicio,tiempo_fin,titulo,clientes(nombre,telefono),empleados(nombre),servicios(nombre))";

const buildResponse = (status, extra = {}, code = 200) =>
  NextResponse.json({ status, ...extra }, { status: code });

const createToken = () => {
  if (typeof randomUUID === "function") return randomUUID();
  return randomBytes(16).toString("hex");
};

const resolveAdminClient = () => {
  try {
    return { client: getSupabaseAdmin(), error: null };
  } catch (error) {
    return { client: null, error };
  }
};

const normalizeStatus = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const getBearerToken = (request) => {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
};

export async function GET(request) {
  const token = getBearerToken(request);
  if (!token) {
    return buildResponse(
      "unauthorized",
      { message: "Falta el token de acceso." },
      401
    );
  }

  const { client, error: clientError } = resolveAdminClient();
  if (clientError) {
    return buildResponse(
      "error",
      { message: "No pudimos validar la sesion.", details: clientError.message },
      500
    );
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData?.user) {
    return buildResponse(
      "unauthorized",
      { message: "Sesion invalida." },
      401
    );
  }

  const { data: employee, error: employeeError } = await client
    .from("empleados")
    .select("uuid,id_empresa,role")
    .eq("user_id", userData.user.id)
    .single();

  if (employeeError || !employee) {
    return buildResponse(
      "not_found",
      {
        message: "Empleado no encontrado.",
        details: employeeError?.message,
      },
      404
    );
  }

  const scopeField =
    employee.role === "boss" ? "citas.id_empresa" : "citas.id_empleado";
  const scopeValue = employee.role === "boss" ? employee.id_empresa : employee.uuid;

  const { data, error } = await client
    .from("confirmaciones")
    .select(CONFIRMATIONS_SELECT)
    .eq(scopeField, scopeValue)
    .order("created_at", { ascending: false });

  if (error) {
    return buildResponse(
      "error",
      {
        message: "No pudimos cargar las confirmaciones.",
        details: error.message,
      },
      500
    );
  }

  return buildResponse("ok", { confirmations: data ?? [] });
}

export async function POST(request) {
  const token = getBearerToken(request);
  if (!token) {
    return buildResponse(
      "unauthorized",
      { message: "Falta el token de acceso." },
      401
    );
  }

  const body = await request.json().catch(() => ({}));
  const appointmentId =
    typeof body.appointmentId === "string" ? body.appointmentId.trim() : "";

  if (!appointmentId) {
    return buildResponse(
      "invalid",
      { message: "Falta el identificador de la cita." },
      400
    );
  }

  const { client, error: clientError } = resolveAdminClient();
  if (clientError) {
    return buildResponse(
      "error",
      { message: "No pudimos validar la sesion.", details: clientError.message },
      500
    );
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData?.user) {
    return buildResponse(
      "unauthorized",
      { message: "Sesion invalida." },
      401
    );
  }

  const { data: employee, error: employeeError } = await client
    .from("empleados")
    .select("uuid,id_empresa,role")
    .eq("user_id", userData.user.id)
    .single();

  if (employeeError || !employee) {
    return buildResponse(
      "not_found",
      {
        message: "Empleado no encontrado.",
        details: employeeError?.message,
      },
      404
    );
  }

  const scopeField = employee.role === "boss" ? "id_empresa" : "id_empleado";
  const scopeValue = employee.role === "boss" ? employee.id_empresa : employee.uuid;

  const { data: appointment, error: appointmentError } = await client
    .from("citas")
    .select("uuid,estado,tiempo_inicio")
    .eq("uuid", appointmentId)
    .eq(scopeField, scopeValue)
    .maybeSingle();

  if (appointmentError) {
    return buildResponse(
      "error",
      {
        message: "No pudimos validar la cita.",
        details: appointmentError.message,
      },
      500
    );
  }

  if (!appointment) {
    return buildResponse(
      "not_found",
      { message: "Cita no encontrada." },
      404
    );
  }

  const status = normalizeStatus(appointment.estado);
  if (status !== "pendiente") {
    return buildResponse(
      "locked",
      { message: "La cita no esta pendiente." },
      409
    );
  }

  const { error: revokeError } = await client
    .from("confirmaciones")
    .update({ used_at: new Date().toISOString() })
    .eq("id_cita", appointment.uuid)
    .eq("tipo", "confirmar")
    .is("used_at", null);

  if (revokeError) {
    return buildResponse(
      "error",
      {
        message: "No pudimos generar el enlace.",
        details: revokeError.message,
      },
      500
    );
  }

  const tokenHash = createToken();
  const { error: insertError } = await client.from("confirmaciones").insert({
    id_cita: appointment.uuid,
    token_hash: tokenHash,
    expires_at: appointment.tiempo_inicio,
    tipo: "confirmar",
  });

  if (insertError) {
    return buildResponse(
      "error",
      {
        message: "No pudimos generar el enlace.",
        details: insertError.message,
      },
      500
    );
  }

  return buildResponse("ok", { token: tokenHash });
}
