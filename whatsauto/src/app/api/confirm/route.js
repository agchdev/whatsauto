import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const TOKEN_SELECT =
  "uuid,id_cita,token_hash,expires_at,used_at,citas(estado,tiempo_inicio,tiempo_fin,titulo,descripcion,clientes(nombre,telefono),servicios(nombre,precio))";

const buildResponse = (status, extra = {}) =>
  NextResponse.json({ status, ...extra });

const normalizeToken = (value) => (typeof value === "string" ? value.trim() : "");

const isExpired = (expiresAt) => {
  if (!expiresAt) return true;
  const expiration = new Date(expiresAt);
  if (Number.isNaN(expiration.getTime())) return true;
  return expiration.getTime() < Date.now();
};

const fetchConfirmation = async (token) => {
  const { data, error } = await supabaseAdmin
    .from("citas_confirmaciones")
    .select(TOKEN_SELECT)
    .eq("token_hash", token)
    .maybeSingle();

  if (error) {
    return { error, data: null };
  }

  return { data, error: null };
};

export async function GET(request) {
  const token = normalizeToken(new URL(request.url).searchParams.get("token"));

  if (!token) {
    return buildResponse("invalid", { message: "Token no valido." });
  }

  const { data, error } = await fetchConfirmation(token);

  if (error) {
    return buildResponse("error", {
      message: "No pudimos validar la cita.",
      details: error.message,
    });
  }

  if (!data) {
    return buildResponse("not_found", { message: "Token no encontrado." });
  }

  if (data.used_at) {
    return buildResponse("used", { message: "Este enlace ya fue utilizado." });
  }

  if (isExpired(data.expires_at)) {
    return buildResponse("expired", {
      message: "El enlace de confirmacion ha expirado.",
    });
  }

  return buildResponse("ok", {
    appointment: data.citas,
    tokenId: data.uuid,
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = normalizeToken(body.token);
  const action = normalizeToken(body.action);

  if (!token || !["confirm", "reject"].includes(action)) {
    return buildResponse("invalid", { message: "Solicitud no valida." });
  }

  const { data, error } = await fetchConfirmation(token);

  if (error) {
    return buildResponse("error", {
      message: "No pudimos validar la cita.",
      details: error.message,
    });
  }

  if (!data) {
    return buildResponse("not_found", { message: "Token no encontrado." });
  }

  if (data.used_at) {
    return buildResponse("used", { message: "Este enlace ya fue utilizado." });
  }

  if (isExpired(data.expires_at)) {
    return buildResponse("expired", {
      message: "El enlace de confirmacion ha expirado.",
    });
  }

  const targetState = action === "confirm" ? "confirmada" : "rechazada";
  const currentState = data.citas?.estado;

  if (currentState === "realizada") {
    return buildResponse("locked", {
      message: "Esta cita ya fue realizada.",
    });
  }

  if (currentState !== targetState) {
    const { error: updateError } = await supabaseAdmin
      .from("citas")
      .update({ estado: targetState, updated_at: new Date().toISOString() })
      .eq("uuid", data.id_cita);

    if (updateError) {
      return buildResponse("error", {
        message: "No pudimos actualizar la cita.",
        details: updateError.message,
      });
    }
  }

  const { error: confirmationError } = await supabaseAdmin
    .from("citas_confirmaciones")
    .update({ used_at: new Date().toISOString() })
    .eq("uuid", data.uuid)
    .is("used_at", null);

  if (confirmationError) {
    return buildResponse("error", {
      message: "No pudimos cerrar la confirmacion.",
      details: confirmationError.message,
    });
  }

  return buildResponse(action === "confirm" ? "confirmed" : "rejected", {
    message:
      action === "confirm"
        ? "La cita ha sido confirmada."
        : "La cita ha sido rechazada.",
  });
}
