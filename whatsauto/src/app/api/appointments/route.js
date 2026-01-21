import { randomBytes, randomUUID } from "crypto";
import { buildResponse, requireAuth, requireEmployee } from "../_helpers";

const VALID_STATUSES = new Set([
  "pendiente",
  "confirmada",
  "rechazada",
  "realizada",
  "cancelada",
]);
const DUPLICATE_BLOCKING_STATUSES = ["pendiente", "confirmada", "realizada"];

const createToken = () => {
  if (typeof randomUUID === "function") return randomUUID();
  return randomBytes(16).toString("hex");
};

const parseDateParts = (value) => {
  if (!value || typeof value !== "string") return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
};

const parseTimeParts = (value) => {
  if (!value || typeof value !== "string") return null;
  const [hour, minute] = value.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return { hour, minute };
};

const parseTimeMinutes = (value) => {
  if (!value) return null;
  const [hour, minute] = String(value).split(":");
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute || "0");
  if (!Number.isFinite(parsedHour) || !Number.isFinite(parsedMinute)) return null;
  return parsedHour * 60 + parsedMinute;
};

const buildDateKey = ({ year, month, day }) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const getWeekdayNumber = ({ year, month, day }) => {
  const date = new Date(year, month - 1, day);
  return ((date.getDay() + 6) % 7) + 1;
};

const isOverlappingRange = (start, end, rangeStart, rangeEnd) =>
  start < rangeEnd && end > rangeStart;

const normalizeDateOnly = (value) => {
  if (!value) return "";
  return String(value).split("T")[0];
};

const buildUtcIso = (dateParts, timeParts, offsetMinutes) => {
  const offset = Number(offsetMinutes);
  if (!Number.isFinite(offset)) return null;
  const utcMs =
    Date.UTC(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      timeParts.hour,
      timeParts.minute
    ) +
    offset * 60000;
  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const ensureEmployeeScope = async (client, employeeData, targetEmployeeId) => {
  if (!targetEmployeeId) return { error: "Selecciona un empleado." };

  if (employeeData.role !== "boss") {
    if (targetEmployeeId !== employeeData.uuid) {
      return { error: "No tienes permiso para asignar otro empleado." };
    }
    return { data: employeeData };
  }

  const { data, error } = await client
    .from("empleados")
    .select("uuid,id_empresa")
    .eq("uuid", targetEmployeeId)
    .eq("id_empresa", employeeData.id_empresa)
    .single();

  if (error || !data) {
    return { error: "Empleado no encontrado." };
  }

  return { data };
};

const ensureClientScope = async (client, companyId, clientId) => {
  if (!clientId) return { error: "Selecciona un cliente." };
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

const ensureServiceScope = async (client, companyId, serviceId) => {
  if (!serviceId) return { error: "Selecciona un servicio." };
  const { data, error } = await client
    .from("servicios")
    .select("uuid,duracion")
    .eq("uuid", serviceId)
    .eq("id_empresa", companyId)
    .single();
  if (error || !data) {
    return { error: "Servicio no encontrado." };
  }
  const duration = Number(data.duracion);
  if (!Number.isFinite(duration) || duration <= 0) {
    return { error: "El servicio seleccionado no tiene duracion valida." };
  }
  return { data: { uuid: data.uuid, duracion: duration } };
};

const validateSchedule = (scheduleEntries, startMinutes, endMinutes) => {
  if (!scheduleEntries.length) {
    return { ok: false, message: "El empleado no tiene horario registrado para este dia." };
  }

  let hasMatchingWindow = false;
  let hasBreakConflict = false;
  let hasAvailableWindow = false;

  for (const schedule of scheduleEntries) {
    const entryMinutes = parseTimeMinutes(schedule.hora_entrada);
    const exitMinutes = parseTimeMinutes(schedule.hora_salida);
    if (
      entryMinutes === null ||
      exitMinutes === null ||
      exitMinutes <= entryMinutes
    ) {
      continue;
    }
    if (startMinutes < entryMinutes || endMinutes > exitMinutes) {
      continue;
    }

    hasMatchingWindow = true;

    const breakStart = parseTimeMinutes(schedule.hora_descanso_inicio);
    const breakEnd = parseTimeMinutes(schedule.hora_descanso_fin);
    if (
      breakStart !== null &&
      breakEnd !== null &&
      breakEnd > breakStart &&
      isOverlappingRange(startMinutes, endMinutes, breakStart, breakEnd)
    ) {
      hasBreakConflict = true;
      continue;
    }

    hasAvailableWindow = true;
    break;
  }

  if (!hasAvailableWindow) {
    return {
      ok: false,
      message: hasMatchingWindow && hasBreakConflict
        ? "La cita coincide con el descanso del empleado."
        : "La cita esta fuera del horario de trabajo del empleado.",
    };
  }

  return { ok: true };
};

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const employeeData = employeeResult.employee;
  const body = await request.json().catch(() => ({}));
  const {
    clientId,
    employeeId,
    serviceId,
    date,
    time,
    title,
    description,
    timezoneOffsetMinutes,
  } = body || {};

  const dateParts = parseDateParts(date);
  const timeParts = parseTimeParts(time);
  if (!dateParts || !timeParts) {
    return buildResponse("invalid", { message: "Selecciona fecha y hora de inicio." }, 400);
  }

  const serviceResult = await ensureServiceScope(client, employeeData.id_empresa, serviceId);
  if (serviceResult.error) {
    return buildResponse("invalid", { message: serviceResult.error }, 400);
  }

  const employeeScope = await ensureEmployeeScope(client, employeeData, employeeId);
  if (employeeScope.error) {
    return buildResponse("forbidden", { message: employeeScope.error }, 403);
  }

  const clientScope = await ensureClientScope(client, employeeData.id_empresa, clientId);
  if (clientScope.error) {
    return buildResponse("invalid", { message: clientScope.error }, 400);
  }

  const duration = serviceResult.data.duracion;
  const startMinutes = timeParts.hour * 60 + timeParts.minute;
  const endMinutes = startMinutes + duration;
  if (endMinutes > 24 * 60) {
    return buildResponse(
      "invalid",
      { message: "La cita debe terminar el mismo dia." },
      400
    );
  }

  const startIso = buildUtcIso(dateParts, timeParts, timezoneOffsetMinutes);
  if (!startIso) {
    return buildResponse("invalid", { message: "La fecha u hora no son validas." }, 400);
  }
  const endIso = new Date(new Date(startIso).getTime() + duration * 60000).toISOString();

  const { data: duplicateAppointments, error: duplicateError } = await client
    .from("citas")
    .select("uuid")
    .eq("id_empresa", employeeData.id_empresa)
    .eq("id_empleado", employeeId)
    .eq("id_cliente", clientId)
    .eq("id_servicio", serviceId)
    .eq("tiempo_inicio", startIso)
    .in("estado", DUPLICATE_BLOCKING_STATUSES)
    .limit(1);

  if (duplicateError) {
    return buildResponse(
      "error",
      { message: "No pudimos validar la cita.", details: duplicateError.message },
      500
    );
  }

  if (duplicateAppointments?.length) {
    return buildResponse(
      "conflict",
      {
        message:
          "Ya existe una cita para ese cliente, empleado y servicio en ese horario.",
      },
      409
    );
  }

  const weekdayNumber = getWeekdayNumber(dateParts);
  const [scheduleResponse, vacationsResponse] = await Promise.all([
    client
      .from("horarios")
      .select("hora_entrada,hora_salida,hora_descanso_inicio,hora_descanso_fin")
      .eq("id_empresa", employeeData.id_empresa)
      .eq("id_empleado", employeeId)
      .eq("dia_semana", weekdayNumber),
    client
      .from("vacaciones")
      .select("fecha_inicio,fecha_fin")
      .eq("id_empresa", employeeData.id_empresa)
      .eq("id_empleado", employeeId),
  ]);

  if (scheduleResponse.error) {
    return buildResponse(
      "error",
      {
        message: "No pudimos validar el horario del empleado.",
        details: scheduleResponse.error.message,
      },
      500
    );
  }

  if (vacationsResponse.error) {
    return buildResponse(
      "error",
      {
        message: "No pudimos validar las vacaciones del empleado.",
        details: vacationsResponse.error.message,
      },
      500
    );
  }

  const scheduleValidation = validateSchedule(
    scheduleResponse.data || [],
    startMinutes,
    endMinutes
  );
  if (!scheduleValidation.ok) {
    return buildResponse("invalid", { message: scheduleValidation.message }, 400);
  }

  const dateKey = buildDateKey(dateParts);
  const vacations = vacationsResponse.data || [];
  const isOnVacation = vacations.some((vacation) => {
    const startDate = normalizeDateOnly(vacation.fecha_inicio);
    const endDate = normalizeDateOnly(vacation.fecha_fin) || startDate;
    if (!startDate) return false;
    return dateKey >= startDate && dateKey <= endDate;
  });

  if (isOnVacation) {
    return buildResponse(
      "invalid",
      { message: "El empleado esta de vacaciones en esa fecha." },
      400
    );
  }

  const { data: appointment, error: appointmentError } = await client
    .from("citas")
    .insert({
      id_empresa: employeeData.id_empresa,
      id_empleado: employeeId,
      id_cliente: clientId,
      id_servicio: serviceId,
      titulo: typeof title === "string" ? title.trim() || null : null,
      descripcion: typeof description === "string" ? description.trim() || null : null,
      tiempo_inicio: startIso,
      tiempo_fin: endIso,
      estado: "pendiente",
    })
    .select("uuid,tiempo_inicio")
    .single();

  if (appointmentError) {
    return buildResponse(
      "error",
      { message: "No pudimos crear la cita.", details: appointmentError.message },
      500
    );
  }

  const token = createToken();
  const { error: confirmationError } = await client.from("confirmaciones").insert({
    id_cita: appointment.uuid,
    token_hash: token,
    expires_at: appointment.tiempo_inicio,
    tipo: "confirmar",
  });

  if (confirmationError) {
    return buildResponse(
      "error",
      {
        message: "La cita se creo, pero no pudimos generar la confirmacion.",
        details: confirmationError.message,
      },
      500
    );
  }

  return buildResponse("ok", {
    token,
    appointment,
    message: "Cita creada. Confirmacion generada.",
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
  const appointmentId =
    typeof body.appointmentId === "string" ? body.appointmentId.trim() : "";
  const nextStatus =
    typeof body.status === "string" ? body.status.trim().toLowerCase() : "";

  if (!appointmentId || !VALID_STATUSES.has(nextStatus)) {
    return buildResponse("invalid", { message: "Solicitud no valida." }, 400);
  }

  const scopeField = employeeData.role === "boss" ? "id_empresa" : "id_empleado";
  const scopeValue =
    employeeData.role === "boss" ? employeeData.id_empresa : employeeData.uuid;

  const { data: appointment, error: fetchError } = await client
    .from("citas")
    .select("uuid")
    .eq("uuid", appointmentId)
    .eq(scopeField, scopeValue)
    .maybeSingle();

  if (fetchError) {
    return buildResponse(
      "error",
      { message: "No pudimos validar la cita.", details: fetchError.message },
      500
    );
  }

  if (!appointment) {
    return buildResponse("not_found", { message: "Cita no encontrada." }, 404);
  }

  const { error: updateError } = await client
    .from("citas")
    .update({ estado: nextStatus, updated_at: new Date().toISOString() })
    .eq("uuid", appointmentId);

  if (updateError) {
    return buildResponse(
      "error",
      { message: "No pudimos actualizar el estado.", details: updateError.message },
      500
    );
  }

  return buildResponse("ok", { message: "Estado actualizado." });
}
