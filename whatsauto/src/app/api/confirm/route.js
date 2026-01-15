import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

const VALID_TIPOS = new Set(["confirmar", "eliminar", "espera", "modificar"]);
const DEFAULT_TIPO = "confirmar";

const TOKEN_SELECT =
  "uuid,id_cita,token_hash,expires_at,used_at,tipo,citas(estado,tiempo_inicio,tiempo_fin,titulo,descripcion,clientes(nombre,telefono),servicios(nombre,precio))";

const buildResponse = (status, extra = {}) =>
  NextResponse.json({ status, ...extra });

const normalizeToken = (value) => (typeof value === "string" ? value.trim() : "");
const normalizeTipo = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const resolveTipo = (value) => normalizeTipo(value) || DEFAULT_TIPO;

const isExpired = (expiresAt) => {
  if (!expiresAt) return true;
  const expiration = new Date(expiresAt);
  if (Number.isNaN(expiration.getTime())) return true;
  return expiration.getTime() < Date.now();
};

const resolveAdminClient = () => {
  try {
    return { client: getSupabaseAdmin(), error: null };
  } catch (error) {
    return { client: null, error };
  }
};

const fetchConfirmation = async (token, tipo) => {
  const { client, error: clientError } = resolveAdminClient();
  if (clientError) {
    return { error: clientError, data: null };
  }

  let query = client
    .from("confirmaciones")
    .select(TOKEN_SELECT)
    .eq("token_hash", token);

  if (tipo) {
    query = query.eq("tipo", tipo);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { error, data: null };
  }

  return { data, error: null };
};

export async function GET(request) {
  const url = new URL(request.url);
  const token = normalizeToken(url.searchParams.get("token"));
  const tipo = resolveTipo(url.searchParams.get("tipo"));

  if (!token) {
    return buildResponse("invalid", { message: "Token no valido." });
  }

  if (!VALID_TIPOS.has(tipo)) {
    return buildResponse("invalid", { message: "Tipo de confirmacion no valido." });
  }

  const { data, error } = await fetchConfirmation(token, tipo);

  if (error) {
    return buildResponse("error", {
      message: "No pudimos validar la cita.",
      details: error?.message,
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
    tipo: data.tipo,
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = normalizeToken(body.token);
  const action = normalizeToken(body.action);
  const tipo = resolveTipo(body.tipo);

  if (!token || !["confirm", "reject"].includes(action)) {
    return buildResponse("invalid", { message: "Solicitud no valida." });
  }

  if (!VALID_TIPOS.has(tipo)) {
    return buildResponse("invalid", { message: "Tipo de confirmacion no valido." });
  }

  const { data, error } = await fetchConfirmation(token, tipo);

  if (error) {
    return buildResponse("error", {
      message: "No pudimos validar la cita.",
      details: error?.message,
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

  const { client, error: clientError } = resolveAdminClient();
  if (clientError) {
    return buildResponse("error", {
      message: "No pudimos actualizar la cita.",
      details: clientError?.message,
    });
  }

  if (tipo === "confirmar") {
    const targetState = action === "confirm" ? "confirmada" : "rechazada";
    const currentState = data.citas?.estado;

    if (currentState === "realizada") {
      return buildResponse("locked", {
        message: "Esta cita ya fue realizada.",
      });
    }

    if (currentState !== targetState) {
      const { error: updateError } = await client
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
  }

  const { error: confirmationError } = await client
    .from("confirmaciones")
    .update({ used_at: new Date().toISOString() })
    .eq("uuid", data.uuid)
    .is("used_at", null);

  if (confirmationError) {
    return buildResponse("error", {
      message: "No pudimos cerrar la confirmacion.",
      details: confirmationError.message,
    });
  }

  const messages = {
    confirmar: {
      confirm: "La cita ha sido confirmada.",
      reject: "La cita ha sido rechazada.",
    },
    eliminar: {
      confirm: "La solicitud de eliminacion ha sido confirmada.",
      reject: "La solicitud de eliminacion ha sido rechazada.",
    },
    espera: {
      confirm: "La solicitud de lista de espera ha sido confirmada.",
      reject: "La solicitud de lista de espera ha sido rechazada.",
    },
    modificar: {
      confirm: "La solicitud de modificacion ha sido confirmada.",
      reject: "La solicitud de modificacion ha sido rechazada.",
    },
  };

  return buildResponse(action === "confirm" ? "confirmed" : "rejected", {
    message: messages[tipo]?.[action] || "Solicitud actualizada.",
  });
}
