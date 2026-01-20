import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

export const buildResponse = (status, extra = {}, code = 200) =>
  NextResponse.json({ status, ...extra }, { status: code });

export const resolveAdminClient = () => {
  try {
    return { client: getSupabaseAdmin(), error: null };
  } catch (error) {
    return { client: null, error };
  }
};

export const getBearerToken = (request) => {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
};

export const requireAuth = async (request) => {
  const token = getBearerToken(request);
  if (!token) {
    return {
      response: buildResponse(
        "unauthorized",
        { message: "Falta el token de acceso." },
        401
      ),
    };
  }

  const { client, error: clientError } = resolveAdminClient();
  if (clientError) {
    return {
      response: buildResponse(
        "error",
        { message: "No pudimos validar la sesion.", details: clientError.message },
        500
      ),
    };
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData?.user) {
    return {
      response: buildResponse(
        "unauthorized",
        { message: "Sesion invalida." },
        401
      ),
    };
  }

  return { client, user: userData.user, token };
};

export const requireEmployee = async (client, userId) => {
  const { data, error } = await client
    .from("empleados")
    .select("uuid,id_empresa,nombre,correo,telefono,role")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return {
      response: buildResponse(
        "not_found",
        { message: "Empleado no encontrado.", details: error?.message },
        404
      ),
    };
  }

  return { employee: data };
};

export const notifyWebhook = async (event, payload = {}) => {
  const webhookUrl =
    process.env.N8N_WEBHOOK_URL || process.env.WEBHOOK_URL || "";

  if (!webhookUrl) {
    return { skipped: true };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });

    if (!response.ok) {
      console.warn("Webhook failed", response.status, response.statusText);
      return { ok: false, status: response.status };
    }

    return { ok: true };
  } catch (error) {
    console.warn("Webhook error", error);
    return { ok: false, error };
  }
};
