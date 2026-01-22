import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { notifyWebhook } from "../_helpers";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

const VALID_TIPOS = new Set(["confirmar", "eliminar", "espera", "modificar"]);
const DEFAULT_TIPO = "confirmar";

const TOKEN_SELECT =
  "uuid,id_cita,token_hash,expires_at,used_at,tipo,citas(id_empresa,id_empleado,id_servicio,id_cliente,estado,tiempo_inicio,tiempo_fin,titulo,descripcion,clientes(nombre,telefono),servicios(nombre,precio))";
const WAITLIST_TOKEN_SELECT =
  "uuid,id_espera,token_hash,expires_at,used_at,esperas(estado,id_cita,id_cliente,citas(estado,tiempo_inicio,tiempo_fin,titulo,descripcion,clientes(nombre,telefono),servicios(nombre,precio)),clientes(nombre,telefono))";

const buildResponse = (status, extra = {}) =>
  NextResponse.json({ status, ...extra });

const normalizeToken = (value) => (typeof value === "string" ? value.trim() : "");
const normalizeTipo = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const resolveTipo = (value) => normalizeTipo(value) || DEFAULT_TIPO;
const normalizeStatus = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

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

const fetchWaitlistConfirmation = async (token) => {
  const { client, error: clientError } = resolveAdminClient();
  if (clientError) {
    return { error: clientError, data: null };
  }

  const { data, error } = await client
    .from("confirmaciones_esperas")
    .select(WAITLIST_TOKEN_SELECT)
    .eq("token_hash", token)
    .maybeSingle();

  if (error) {
    return { error, data: null };
  }

  return { data, error: null };
};

const buildAppointmentPayload = (data) => {
  const appointment = data?.citas || {};

  return {
    id: data?.id_cita || null,
    id_empleado: appointment?.id_empleado || null,
    id_servicio: appointment?.id_servicio || null,
    id_cliente: appointment?.id_cliente || null,
    estado: appointment?.estado || null,
    tiempo_inicio: appointment?.tiempo_inicio || null,
    tiempo_fin: appointment?.tiempo_fin || null,
    titulo: appointment?.titulo || null,
    descripcion: appointment?.descripcion || null,
    cliente: appointment?.clientes || null,
    servicio: appointment?.servicios || null,
  };
};

const buildWaitlistAppointment = (data) => {
  const waitlistEntry = data?.esperas || {};
  const appointment = waitlistEntry?.citas || {};
  const waitlistClient = waitlistEntry?.clientes || null;

  return {
    ...appointment,
    clientes: waitlistClient || appointment?.clientes || null,
  };
};

const formatWaitlistTitle = (serviceName, clientName) =>
  [serviceName, clientName].filter(Boolean).join(" - ");

const cleanupDuplicateAppointments = async (client, appointmentId, appointment) => {
  if (!appointmentId || !appointment) return { skipped: true };
  const { id_empresa, id_empleado, id_servicio, tiempo_inicio } = appointment;
  if (!id_empresa || !id_empleado || !id_servicio || !tiempo_inicio) {
    return { skipped: true };
  }

  const parsedStart = new Date(tiempo_inicio);
  const startValue = Number.isNaN(parsedStart.getTime())
    ? tiempo_inicio
    : parsedStart.toISOString();

  const { error } = await client
    .from("citas")
    .delete()
    .eq("id_empresa", id_empresa)
    .eq("id_empleado", id_empleado)
    .eq("id_servicio", id_servicio)
    .eq("tiempo_inicio", startValue)
    .in("estado", ["pendiente", "cancelada"])
    .neq("uuid", appointmentId);

  return { error };
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

  const { data, error } =
    tipo === "espera"
      ? await fetchWaitlistConfirmation(token)
      : await fetchConfirmation(token, tipo);

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

  if (tipo === "confirmar") {
    const { client, error: clientError } = resolveAdminClient();
    if (clientError) {
      return buildResponse("error", {
        message: "No pudimos validar la cita.",
        details: clientError?.message,
      });
    }

    const cleanupResult = await cleanupDuplicateAppointments(
      client,
      data.id_cita,
      data.citas
    );

    if (cleanupResult?.error) {
      return buildResponse("error", {
        message: "No pudimos limpiar las citas duplicadas.",
        details: cleanupResult.error.message,
      });
    }
  }

  const appointment =
    tipo === "espera" ? buildWaitlistAppointment(data) : data.citas;

  return buildResponse("ok", {
    appointment,
    tokenId: data.uuid,
    tipo,
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

  const { data, error } =
    tipo === "espera"
      ? await fetchWaitlistConfirmation(token)
      : await fetchConfirmation(token, tipo);

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

  let webhookEvent = "";
  let waitlistClientIds = [];
  let waitlistClientPhones = [];
  let waitlistClients = [];
  let waitlistClientTitles = [];
  let shouldDeleteWaitlist = false;

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

    if (action === "confirm") {
      const cleanupResult = await cleanupDuplicateAppointments(
        client,
        data.id_cita,
        data.citas
      );

      if (cleanupResult?.error) {
        return buildResponse("error", {
          message: "No pudimos limpiar las citas duplicadas.",
          details: cleanupResult.error.message,
        });
      }
    }
  }

  if (tipo === "espera") {
    if (!data.id_espera) {
      return buildResponse("error", {
        message: "No pudimos actualizar la espera.",
      });
    }

    const currentState = normalizeStatus(data.esperas?.estado);
    if (currentState && currentState !== "pendiente") {
      return buildResponse("locked", {
        message: "Esta espera ya fue respondida.",
      });
    }

    if (action === "reject") {
      shouldDeleteWaitlist = true;
    } else {
      const nextState = "confirmada";
      if (currentState !== nextState) {
        const { error: updateError } = await client
          .from("esperas")
          .update({ estado: nextState })
          .eq("uuid", data.id_espera);

        if (updateError) {
          return buildResponse("error", {
            message: "No pudimos actualizar la espera.",
            details: updateError.message,
          });
        }
      }
    }
  }

  if (tipo === "eliminar" && action === "confirm") {
    if (!data.id_cita) {
      return buildResponse("error", {
        message: "No pudimos cancelar la cita.",
      });
    }

    const { data: waitlistEntries, error: waitlistFetchError } = await client
      .from("esperas")
      .select("id_cliente,clientes(nombre,telefono)")
      .eq("id_cita", data.id_cita);

    if (waitlistFetchError) {
      return buildResponse("error", {
        message: "No pudimos cargar la lista de espera.",
        details: waitlistFetchError.message,
      });
    }

    const serviceName = data?.citas?.servicios?.nombre || null;
    waitlistClients = (waitlistEntries || [])
      .map((entry) => {
        const clientName = entry?.clientes?.nombre || null;
        return {
          id: entry?.id_cliente || null,
          telefono: entry?.clientes?.telefono || null,
          nombre: clientName,
          titulo: formatWaitlistTitle(serviceName, clientName),
        };
      })
      .filter((client) => client.id);

    waitlistClientIds = waitlistClients.map((client) => client.id);
    waitlistClientPhones = waitlistClients.map((client) => client.telefono);
    waitlistClientTitles = waitlistClients
      .map((client) => client.titulo)
      .filter(Boolean);

    const { error: updateError } = await client
      .from("citas")
      .update({ estado: "cancelada", updated_at: new Date().toISOString() })
      .eq("uuid", data.id_cita);

    if (updateError) {
      return buildResponse("error", {
        message: "No pudimos cancelar la cita.",
        details: updateError.message,
      });
    }

    if (data.citas) {
      data.citas.estado = "cancelada";
    }

    webhookEvent = "appointment_deleted_confirmed";
  }

  if (tipo === "modificar" && action === "confirm") {
    webhookEvent = "appointment_time_change_confirmed";
  }

  const confirmationTable =
    tipo === "espera" ? "confirmaciones_esperas" : "confirmaciones";
  const { error: confirmationError } = await client
    .from(confirmationTable)
    .update({ used_at: new Date().toISOString() })
    .eq("uuid", data.uuid)
    .is("used_at", null);

  if (confirmationError) {
    return buildResponse("error", {
      message: "No pudimos cerrar la confirmacion.",
      details: confirmationError.message,
    });
  }

  if (shouldDeleteWaitlist) {
    const { error: confirmationDeleteError } = await client
      .from("confirmaciones_esperas")
      .delete()
      .eq("uuid", data.uuid);

    if (confirmationDeleteError) {
      return buildResponse("error", {
        message: "No pudimos eliminar la confirmacion de la espera.",
        details: confirmationDeleteError.message,
      });
    }

    const { error: waitlistDeleteError } = await client
      .from("esperas")
      .delete()
      .eq("uuid", data.id_espera);

    if (waitlistDeleteError) {
      return buildResponse("error", {
        message: "No pudimos eliminar la espera.",
        details: waitlistDeleteError.message,
      });
    }
  }

  if (webhookEvent) {
    const webhookToken = randomUUID();
    await notifyWebhook(webhookEvent, {
      action,
      id_cita: data.id_cita,
      token_hash: webhookToken,
      confirmation: {
        id: data.uuid,
        tipo: data.tipo,
      },
      appointment: buildAppointmentPayload(data),
      waitlist_client_ids: waitlistClientIds,
      waitlist_client_phones: waitlistClientPhones,
      waitlist_clients: waitlistClients,
      waitlist_titles: waitlistClientTitles,
      waitlist_count: waitlistClientIds.length,
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
